import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '../../common/dto/pagination-query.dto';
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface';
import { LOCATION_REPOSITORY } from '../locations/repositories/location.repository.token';
import type { ILocationRepository } from '../locations/repositories/location.repository.interface';
import { LocationDocument } from '../locations/schemas/location.schema';
import { TRUCK_REPOSITORY } from '../trucks/repositories/truck.repository.token';
import type { ITruckRepository } from '../trucks/repositories/truck.repository.interface';
import { TruckDocument, TruckStatus } from '../trucks/schemas/truck.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ORDER_REPOSITORY } from './repositories/order.repository.token';
import type {
  IOrderRepository,
  OrderStatusHistoryEntryInput,
} from './repositories/order.repository.interface';
import {
  OrderDocument,
  OrderStatus,
  RESERVED_TRUCK_ORDER_STATUSES,
} from './schemas/order.schema';

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

const RESERVED_ORDER_STATUSES = new Set<OrderStatus>(
  RESERVED_TRUCK_ORDER_STATUSES,
);

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
  truck: OrderTruckResponse | null;
  pickup: OrderLocationResponse | null;
  dropoff: OrderLocationResponse | null;
  statusHistory: OrderStatusHistoryResponse[];
}

export interface OrderTruckResponse {
  id: string;
  plate: string;
  model: string;
  color: string;
  year: string;
  capacityKg?: number;
  status: TruckStatus;
}

export interface OrderLocationResponse {
  id: string;
  name: string;
  address: string;
  place_id: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class OrdersService {
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
    this.assertTruckExists(truck);

    await this.assertLocationsExist(userId, pickupId, dropoffId);

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

      return this.mapOrderWithRelations(userId, createdOrder);
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
   * @returns Paginated list of orders sorted by most recently created.
   */
  async findAll(
    userId: string,
    query: FindOrdersQueryDto,
  ): Promise<PaginatedResponse<OrderResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const createdFrom = query.createdFrom
      ? new Date(query.createdFrom)
      : undefined;
    const createdTo = query.createdTo ? new Date(query.createdTo) : undefined;

    this.assertValidDateRange(createdFrom, createdTo);

    const result = await this.orderRepository.findAllByOwner({
      userId,
      page,
      limit,
      status: query.status,
      createdFrom,
      createdTo,
    });

    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    return {
      items: await Promise.all(
        result.items.map((order) => this.mapOrderWithRelations(userId, order)),
      ),
      page,
      limit,
      total: result.total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
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

    const order = await this.orderRepository.findByIdAndOwner(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrderWithRelations(userId, order);
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

    if (dto.status === OrderStatus.ASSIGNED) {
      await this.assertTruckHasNoReservedOrders(
        currentOrder.truckId.toString(),
        orderId,
      );
    }

    const updatedOrder = await this.orderRepository
      .updateStatusByIdAndOwner(orderId, userId, dto.status, {
        status: dto.status,
        changedAt: new Date(),
      })
      .catch((error: unknown) => {
        if (this.isDuplicateKeyError(error)) {
          throw new ConflictException('Truck already has an active order');
        }

        throw error;
      });

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    await this.syncTruckStatusWithOrder(
      userId,
      updatedOrder.truckId.toString(),
      dto.status,
    );

    return this.mapOrderWithRelations(userId, updatedOrder);
  }

  /**
   * Deletes an order owned by the authenticated user.
   * @param userId User identifier that owns the order.
   * @param orderId Order identifier to remove.
   * @throws BadRequestException if order identifier is not a valid ObjectId.
   * @throws NotFoundException if no order exists for that user and identifier.
   * @returns Promise that resolves when deletion is completed.
   */
  async remove(userId: string, orderId: string): Promise<void> {
    this.assertValidObjectId(orderId, 'order id');

    const currentOrder = await this.orderRepository.findByIdAndOwner(
      orderId,
      userId,
    );
    if (!currentOrder) {
      throw new NotFoundException('Order not found');
    }

    const deletedOrder = await this.orderRepository.deleteByIdAndOwner(
      orderId,
      userId,
    );
    if (!deletedOrder) {
      throw new NotFoundException('Order not found');
    }

    if (!RESERVED_ORDER_STATUSES.has(deletedOrder.status)) {
      return;
    }

    const remainingReservedOrder = await this.orderRepository.findReservedByTruck(
      deletedOrder.truckId.toString(),
      deletedOrder._id.toString(),
    );

    if (!remainingReservedOrder) {
      const updatedTruck = await this.truckRepository.updateStatus(
        deletedOrder.truckId.toString(),
        userId,
        TruckStatus.AVAILABLE,
      );

      if (!updatedTruck) {
        throw new NotFoundException('Truck not found');
      }
    }
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
   * Ensures date range filters are logically valid.
   * @param createdFrom Start date filter.
   * @param createdTo End date filter.
   * @throws BadRequestException if createdFrom is greater than createdTo.
   * @returns Nothing; validation only.
   */
  private assertValidDateRange(createdFrom?: Date, createdTo?: Date): void {
    if (
      createdFrom &&
      createdTo &&
      createdFrom.getTime() > createdTo.getTime()
    ) {
      throw new BadRequestException(
        'createdFrom must be before or equal to createdTo',
      );
    }
  }

  /**
   * Ensures a truck exists for the authenticated user.
   * @param truck Truck document resolved from repository.
   * @throws NotFoundException if truck does not exist for the user.
   * @returns Nothing; validation only.
   */
  private assertTruckExists(truck: TruckDocument | null): void {
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }
  }

  /**
   * Ensures no other reserved order exists for the truck when assigning an order.
   * @param truckId Truck identifier linked to the order.
   * @param orderId Order identifier currently being assigned.
   * @throws ConflictException if another reserved order already exists.
   * @returns Promise that resolves when validation succeeds.
   */
  private async assertTruckHasNoReservedOrders(
    truckId: string,
    orderId: string,
  ): Promise<void> {
    const reservedOrder = await this.orderRepository.findReservedByTruck(
      truckId,
      orderId,
    );

    if (reservedOrder) {
      throw new ConflictException('Truck already has an active order');
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
   * Resolves the expected truck status from a given order status.
   * @param orderStatus Order status to evaluate.
   * @throws Error no explicit throw; deterministic mapping only.
   * @returns UNAVAILABLE for reserved statuses, otherwise AVAILABLE.
   */
  private resolveTruckStatusForOrder(orderStatus: OrderStatus): TruckStatus {
    return RESERVED_ORDER_STATUSES.has(orderStatus)
      ? TruckStatus.UNAVAILABLE
      : TruckStatus.AVAILABLE;
  }

  /**
   * Updates truck availability according to the current order status.
   * @param userId Authenticated user that owns the truck.
   * @param truckId Truck identifier linked to the order.
   * @param orderStatus Current order status.
   * @throws NotFoundException if truck cannot be found for the user.
   * @returns Nothing; side effect only.
   */
  private async syncTruckStatusWithOrder(
    userId: string,
    truckId: string,
    orderStatus: OrderStatus,
  ): Promise<void> {
    const nextTruckStatus = this.resolveTruckStatusForOrder(orderStatus);
    const updatedTruck = await this.truckRepository.updateStatus(
      truckId,
      userId,
      nextTruckStatus,
    );

    if (!updatedTruck) {
      throw new NotFoundException('Truck not found');
    }
  }

  /**
   * Maps an order with its related entities to the outbound API response format.
   * @param userId Authenticated user owner.
   * @param order Order document returned by repository.
   * @throws Error no explicit throw; mapping only transforms resolved data.
   * @returns A plain response object for controllers.
   */
  private async mapOrderWithRelations(
    userId: string,
    order: OrderDocument,
  ): Promise<OrderResponse> {
    const [truck, pickup, dropoff] = await Promise.all([
      this.truckRepository.findByIdAndOwner(order.truckId.toString(), userId),
      this.locationRepository.findByIdAndOwner(order.pickupId.toString(), userId),
      this.locationRepository.findByIdAndOwner(order.dropoffId.toString(), userId),
    ]);

    return {
      id: order._id.toString(),
      truckId: order.truckId.toString(),
      pickupId: order.pickupId.toString(),
      dropoffId: order.dropoffId.toString(),
      status: order.status,
      createdBy: order.createdBy.toString(),
      truck: truck ? this.mapTruck(truck) : null,
      pickup: pickup ? this.mapLocation(pickup) : null,
      dropoff: dropoff ? this.mapLocation(dropoff) : null,
      statusHistory: (order.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        changedAt: entry.changedAt,
      })),
    };
  }

  /**
   * Maps a truck document to an order-related truck response.
   * @param truck Truck document.
   * @throws Error no explicit throw; deterministic mapping only.
   * @returns Serialized truck data for order responses.
   */
  private mapTruck(truck: TruckDocument): OrderTruckResponse {
    return {
      id: truck._id.toString(),
      plate: truck.plate,
      model: truck.model,
      color: truck.color,
      year: truck.year,
      capacityKg: truck.capacityKg ?? undefined,
      status: truck.status,
    };
  }

  /**
   * Maps a location document to an order-related location response.
   * @param location Location document.
   * @throws Error no explicit throw; deterministic mapping only.
   * @returns Serialized location data for order responses.
   */
  private mapLocation(location: LocationDocument): OrderLocationResponse {
    return {
      id: location._id.toString(),
      name: location.name,
      address: location.address,
      place_id: location.place_id,
      latitude: location.latitude,
      longitude: location.longitude,
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
}
