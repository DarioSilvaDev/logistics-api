import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { LOCATION_REPOSITORY } from '../locations/repositories/location.repository.token';
import type { ILocationRepository } from '../locations/repositories/location.repository.interface';
import { TRUCK_REPOSITORY } from '../trucks/repositories/truck.repository.token';
import type { ITruckRepository } from '../trucks/repositories/truck.repository.interface';
import { TruckDocument, TruckStatus } from '../trucks/schemas/truck.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ORDER_REPOSITORY } from './repositories/order.repository.token';
import type {
  IOrderRepository,
  OrderStatusHistoryEntryInput,
} from './repositories/order.repository.interface';
import { OrderDocument, OrderStatus } from './schemas/order.schema';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const ORDER_CACHE_TTL_MS = 30_000;

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.ASSIGNED]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const TERMINAL_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
]);

export interface OrderStatusHistoryResponse {
  status: OrderStatus;
  changedAt: Date;
}

export interface OrderResponse {
  id: string;
  truckId: string;
  pickupId: string;
  dropoffId: string;
  status: OrderStatus;
  createdBy: string;
  statusHistory: OrderStatusHistoryResponse[];
}

@Injectable()
export class OrdersService {
  private readonly orderByIdCache = new Map<
    string,
    CacheEntry<OrderResponse>
  >();
  private readonly ordersByOwnerCache = new Map<
    string,
    CacheEntry<OrderResponse[]>
  >();

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(TRUCK_REPOSITORY)
    private readonly truckRepository: ITruckRepository,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: ILocationRepository,
  ) {}

  /**
   * Creates an order for the authenticated user and initializes status history.
   * @param userId User identifier that owns the order.
   * @param dto Input payload with truck, pickup, and dropoff references.
   * @throws BadRequestException if any identifier is invalid or pickup and dropoff are equal.
   * @throws NotFoundException if truck, pickup, or dropoff does not exist for the user.
   * @throws ConflictException if truck is not available or already has an active order.
   * @returns The newly created order as API response data.
   */
  async create(userId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    const truckId = dto.truckId.trim();
    const pickupId = dto.pickupId.trim();
    const dropoffId = dto.dropoffId.trim();

    this.assertValidObjectId(truckId, 'truck id');
    this.assertValidObjectId(pickupId, 'pickup location id');
    this.assertValidObjectId(dropoffId, 'dropoff location id');
    this.assertDifferentLocations(pickupId, dropoffId);

    const truck = await this.truckRepository.findByIdAndOwner(truckId, userId);
    this.assertTruckCanBeAssigned(truck);

    await this.assertLocationsExist(userId, pickupId, dropoffId);

    const activeOrder = await this.orderRepository.findActiveByTruck(truckId);
    if (activeOrder) {
      throw new ConflictException('Truck already has an active order');
    }

    const statusHistoryEntry: OrderStatusHistoryEntryInput = {
      status: OrderStatus.CREATED,
      changedAt: new Date(),
    };

    try {
      const createdOrder = await this.orderRepository.create({
        createdBy: userId,
        truckId,
        pickupId,
        dropoffId,
        status: OrderStatus.CREATED,
        statusHistory: [statusHistoryEntry],
      });

      const mappedOrder = this.mapOrder(createdOrder);
      this.invalidateOwnerCache(userId);
      this.setCachedValue(
        this.orderByIdCache,
        this.buildOrderCacheKey(userId, mappedOrder.id),
        mappedOrder,
      );

      return mappedOrder;
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Truck already has an active order');
      }

      throw error;
    }
  }

  /**
   * Returns all orders owned by an authenticated user.
   * @param userId User identifier that owns the orders.
   * @throws Error if the persistence layer fails while querying data.
   * @returns List of orders sorted by most recently created.
   */
  async findAll(userId: string): Promise<OrderResponse[]> {
    const cachedOrders = this.getCachedValue(this.ordersByOwnerCache, userId);
    if (cachedOrders) {
      return cachedOrders;
    }

    const orders = await this.orderRepository.findAllByOwner(userId);
    const mappedOrders = orders.map((order) => this.mapOrder(order));

    this.setCachedValue(this.ordersByOwnerCache, userId, mappedOrders);

    for (const order of mappedOrders) {
      this.setCachedValue(
        this.orderByIdCache,
        this.buildOrderCacheKey(userId, order.id),
        order,
      );
    }

    return mappedOrders;
  }

  /**
   * Finds one order by identifier ensuring it belongs to the authenticated user.
   * @param userId User identifier that owns the order.
   * @param orderId Order identifier to retrieve.
   * @throws BadRequestException if order identifier is not a valid ObjectId.
   * @throws NotFoundException if no order exists for that user and identifier.
   * @returns One order mapped as API response data.
   */
  async findById(userId: string, orderId: string): Promise<OrderResponse> {
    this.assertValidObjectId(orderId, 'order id');

    const cacheKey = this.buildOrderCacheKey(userId, orderId);
    const cachedOrder = this.getCachedValue(this.orderByIdCache, cacheKey);
    if (cachedOrder) {
      return cachedOrder;
    }

    const order = await this.orderRepository.findByIdAndOwner(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const mappedOrder = this.mapOrder(order);
    this.setCachedValue(this.orderByIdCache, cacheKey, mappedOrder);
    return mappedOrder;
  }

  /**
   * Updates the status of an existing order validating transition rules.
   * @param userId User identifier that owns the order.
   * @param orderId Order identifier to update.
   * @param dto Payload containing the next order status.
   * @throws BadRequestException if order identifier is not valid.
   * @throws NotFoundException if the order does not exist for the user.
   * @throws ConflictException if transition is invalid, terminal, or repeated.
   * @returns The updated order with appended status history.
   */
  async updateStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    this.assertValidObjectId(orderId, 'order id');

    const currentOrder = await this.orderRepository.findByIdAndOwner(
      orderId,
      userId,
    );
    if (!currentOrder) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanTransitionStatus(currentOrder.status, dto.status);

    const updatedOrder = await this.orderRepository.updateStatusByIdAndOwner(
      orderId,
      userId,
      dto.status,
      {
        status: dto.status,
        changedAt: new Date(),
      },
    );

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    const mappedOrder = this.mapOrder(updatedOrder);
    this.invalidateOwnerCache(userId);
    this.setCachedValue(
      this.orderByIdCache,
      this.buildOrderCacheKey(userId, orderId),
      mappedOrder,
    );

    return mappedOrder;
  }

  /**
   * Validates that a string contains a valid MongoDB ObjectId.
   * @param id Identifier to validate.
   * @param label Human readable label used in the error message.
   * @throws BadRequestException if identifier is not valid.
   * @returns Nothing; validation only.
   */
  private assertValidObjectId(id: string, label: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  /**
   * Verifies pickup and dropoff are not the same location.
   * @param pickupId Pickup location identifier.
   * @param dropoffId Dropoff location identifier.
   * @throws BadRequestException if both identifiers are equal.
   * @returns Nothing; validation only.
   */
  private assertDifferentLocations(pickupId: string, dropoffId: string): void {
    if (pickupId === dropoffId) {
      throw new BadRequestException('Pickup and dropoff locations must differ');
    }
  }

  /**
   * Ensures a truck exists and can be assigned to an order.
   * @param truck Truck document resolved from repository.
   * @throws NotFoundException if truck does not exist for the user.
   * @throws ConflictException if truck status is not AVAILABLE.
   * @returns Nothing; validation only.
   */
  private assertTruckCanBeAssigned(truck: TruckDocument | null): void {
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    if (truck.status !== TruckStatus.AVAILABLE) {
      throw new ConflictException('Truck is not available');
    }
  }

  /**
   * Checks that pickup and dropoff locations exist for the same user.
   * @param userId User identifier that owns both locations.
   * @param pickupId Pickup location identifier.
   * @param dropoffId Dropoff location identifier.
   * @throws NotFoundException if pickup or dropoff cannot be found.
   * @returns A promise that resolves once both locations are validated.
   */
  private async assertLocationsExist(
    userId: string,
    pickupId: string,
    dropoffId: string,
  ): Promise<void> {
    const [pickup, dropoff] = await Promise.all([
      this.locationRepository.findByIdAndOwner(pickupId, userId),
      this.locationRepository.findByIdAndOwner(dropoffId, userId),
    ]);

    if (!pickup) {
      throw new NotFoundException('Pickup location not found');
    }

    if (!dropoff) {
      throw new NotFoundException('Dropoff location not found');
    }
  }

  /**
   * Validates whether a status transition is allowed for an order.
   * @param currentStatus Current persisted status.
   * @param nextStatus Requested next status.
   * @throws ConflictException if transition is repeated, invalid, or starts from terminal status.
   * @returns Nothing; validation only.
   */
  private assertCanTransitionStatus(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    if (currentStatus === nextStatus) {
      throw new ConflictException('Order already has this status');
    }

    if (TERMINAL_ORDER_STATUSES.has(currentStatus)) {
      throw new ConflictException('Cannot update status from terminal order');
    }

    const allowedStatuses = ORDER_TRANSITIONS[currentStatus];
    if (!allowedStatuses.includes(nextStatus)) {
      throw new ConflictException(
        `Invalid status transition from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  /**
   * Maps an order document to the outbound API response format.
   * @param order Order document returned by repository.
   * @throws Error no explicit throw; mapping only transforms persisted data.
   * @returns A plain response object for controllers.
   */
  private mapOrder(order: OrderDocument): OrderResponse {
    return {
      id: order._id.toString(),
      truckId: order.truckId.toString(),
      pickupId: order.pickupId.toString(),
      dropoffId: order.dropoffId.toString(),
      status: order.status,
      createdBy: order.createdBy.toString(),
      statusHistory: (order.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        changedAt: entry.changedAt,
      })),
    };
  }

  /**
   * Determines whether an unknown error is a Mongo duplicate key error.
   * @param error Error value to inspect.
   * @throws Error no explicit throw; it only checks the received value.
   * @returns true when error code is 11000, otherwise false.
   */
  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }

  /**
   * Builds a stable cache key for an order scoped by owner.
   * @param userId User identifier.
   * @param orderId Order identifier.
   * @throws Error no explicit throw; it concatenates two validated ids.
   * @returns A string key used by in-memory maps.
   */
  private buildOrderCacheKey(userId: string, orderId: string): string {
    return `${userId}:${orderId}`;
  }

  /**
   * Reads a cached value and evicts it if already expired.
   * @param cache In-memory map storing values and expiration metadata.
   * @param key Cache entry key.
   * @throws Error no explicit throw; it returns undefined when key is absent.
   * @returns Cached value when present and valid, otherwise undefined.
   */
  private getCachedValue<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
  ): T | undefined {
    const cachedEntry = cache.get(key);
    if (!cachedEntry) {
      return undefined;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }

    return cachedEntry.value;
  }

  /**
   * Stores a value in cache with a short TTL.
   * @param cache In-memory map where value should be saved.
   * @param key Cache entry key.
   * @param value Value to cache.
   * @throws Error no explicit throw; it updates the in-memory map.
   * @returns Nothing; side effect only.
   */
  private setCachedValue<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
  ): void {
    cache.set(key, {
      value,
      expiresAt: Date.now() + ORDER_CACHE_TTL_MS,
    });
  }

  /**
   * Invalidates cached order list for one owner after mutations.
   * @param userId User identifier whose list cache should be removed.
   * @throws Error no explicit throw; it only mutates in-memory cache.
   * @returns Nothing; side effect only.
   */
  private invalidateOwnerCache(userId: string): void {
    this.ordersByOwnerCache.delete(userId);
  }
}
