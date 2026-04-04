import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { IOrderRepository } from './repositories/order.repository.interface';
import type { ITruckRepository } from '../trucks/repositories/truck.repository.interface';
import type { ILocationRepository } from '../locations/repositories/location.repository.interface';
import { OrderStatus } from './schemas/order.schema';
import { TruckStatus } from '../trucks/schemas/truck.schema';

describe('OrdersService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const truckId = '507f1f77bcf86cd799439012';
  const pickupId = '507f1f77bcf86cd799439013';
  const dropoffId = '507f1f77bcf86cd799439014';
  const orderId = '507f1f77bcf86cd799439015';

  let service: OrdersService;
  let orderRepository: jest.Mocked<IOrderRepository>;
  let truckRepository: jest.Mocked<ITruckRepository>;
  let locationRepository: jest.Mocked<ILocationRepository>;

  const objectId = (value: string) => ({ toString: () => value });

  const createTruckDocument = (status: TruckStatus = TruckStatus.AVAILABLE) =>
    ({
      _id: objectId(truckId),
      plate: 'ABC123',
      model: 'Volvo',
      color: 'White',
      year: '2020',
      status,
      createdBy: objectId(userId),
    }) as any;

  const createOrderDocument = (status: OrderStatus = OrderStatus.CREATED) =>
    ({
      _id: objectId(orderId),
      createdBy: objectId(userId),
      truckId: objectId(truckId),
      pickupId: objectId(pickupId),
      dropoffId: objectId(dropoffId),
      status,
      statusHistory: [
        { status, changedAt: new Date('2026-01-01T00:00:00.000Z') },
      ],
    }) as any;

  beforeEach(() => {
    orderRepository = {
      create: jest.fn(),
      findAllByOwner: jest.fn(),
      findByIdAndOwner: jest.fn(),
      findActiveByTruck: jest.fn(),
      updateStatusByIdAndOwner: jest.fn(),
    } as unknown as jest.Mocked<IOrderRepository>;

    truckRepository = {
      create: jest.fn(),
      findByPlate: jest.fn(),
      findAllByOwner: jest.fn(),
      findByIdAndOwner: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<ITruckRepository>;

    locationRepository = {
      create: jest.fn(),
      findByPlaceIdAndOwner: jest.fn(),
      findAllByOwner: jest.fn(),
      findByIdAndOwner: jest.fn(),
      updateNameByIdAndOwner: jest.fn(),
      deleteByIdAndOwner: jest.fn(),
    } as unknown as jest.Mocked<ILocationRepository>;

    service = new OrdersService(
      orderRepository,
      truckRepository,
      locationRepository,
    );
  });

  it('throws bad request when truckId is invalid', async () => {
    await expect(
      service.create(userId, {
        truckId: 'invalid-id',
        pickupId,
        dropoffId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws bad request when pickup and dropoff are the same', async () => {
    await expect(
      service.create(userId, {
        truckId,
        pickupId,
        dropoffId: pickupId,
      }),
    ).rejects.toThrow('Pickup and dropoff locations must differ');
  });

  it('throws conflict when order creation hits duplicate active-order constraint', async () => {
    truckRepository.findByIdAndOwner.mockResolvedValue(createTruckDocument());
    locationRepository.findByIdAndOwner
      .mockResolvedValueOnce({ _id: objectId(pickupId) } as any)
      .mockResolvedValueOnce({ _id: objectId(dropoffId) } as any);
    orderRepository.findActiveByTruck.mockResolvedValue(null);
    orderRepository.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create(userId, {
        truckId,
        pickupId,
        dropoffId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(truckRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('creates an order and syncs truck status to UNAVAILABLE', async () => {
    const createdOrder = createOrderDocument(OrderStatus.CREATED);

    truckRepository.findByIdAndOwner.mockResolvedValue(createTruckDocument());
    locationRepository.findByIdAndOwner
      .mockResolvedValueOnce({ _id: objectId(pickupId) } as any)
      .mockResolvedValueOnce({ _id: objectId(dropoffId) } as any);
    orderRepository.findActiveByTruck.mockResolvedValue(null);
    orderRepository.create.mockResolvedValue(createdOrder);
    truckRepository.updateStatus.mockResolvedValue(
      createTruckDocument(TruckStatus.UNAVAILABLE),
    );

    const result = await service.create(userId, {
      truckId,
      pickupId,
      dropoffId,
    });

    expect(orderRepository.create).toHaveBeenCalledWith({
      createdBy: userId,
      truckId,
      pickupId,
      dropoffId,
      status: OrderStatus.CREATED,
      statusHistory: [
        {
          status: OrderStatus.CREATED,
          changedAt: expect.any(Date),
        },
      ],
    });
    expect(truckRepository.updateStatus).toHaveBeenCalledWith(
      truckId,
      userId,
      TruckStatus.UNAVAILABLE,
    );
    expect(result).toMatchObject({
      id: orderId,
      status: OrderStatus.CREATED,
      truckId,
      pickupId,
      dropoffId,
      createdBy: userId,
    });
  });

  it('rejects invalid status transition', async () => {
    orderRepository.findByIdAndOwner.mockResolvedValue(
      createOrderDocument(OrderStatus.CREATED),
    );

    await expect(
      service.updateStatus(userId, orderId, {
        status: OrderStatus.DELIVERED,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(orderRepository.updateStatusByIdAndOwner).not.toHaveBeenCalled();
  });

  it('rejects transition from terminal order status', async () => {
    orderRepository.findByIdAndOwner.mockResolvedValue(
      createOrderDocument(OrderStatus.DELIVERED),
    );

    await expect(
      service.updateStatus(userId, orderId, {
        status: OrderStatus.CANCELLED,
      }),
    ).rejects.toThrow('Cannot update status from terminal order');
  });

  it('updates status to DELIVERED and syncs truck to AVAILABLE', async () => {
    const updatedOrder = createOrderDocument(OrderStatus.DELIVERED);

    orderRepository.findByIdAndOwner.mockResolvedValue(
      createOrderDocument(OrderStatus.IN_TRANSIT),
    );
    orderRepository.updateStatusByIdAndOwner.mockResolvedValue(updatedOrder);
    truckRepository.updateStatus.mockResolvedValue(
      createTruckDocument(TruckStatus.AVAILABLE),
    );

    const result = await service.updateStatus(userId, orderId, {
      status: OrderStatus.DELIVERED,
    });

    expect(truckRepository.updateStatus).toHaveBeenCalledWith(
      truckId,
      userId,
      TruckStatus.AVAILABLE,
    );
    expect(result.status).toBe(OrderStatus.DELIVERED);
  });

  it('throws bad request when createdFrom is after createdTo', async () => {
    await expect(
      service.findAll(userId, {
        createdFrom: '2026-02-01T00:00:00.000Z',
        createdTo: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paginated orders response', async () => {
    orderRepository.findAllByOwner.mockResolvedValue({
      items: [createOrderDocument(OrderStatus.ASSIGNED)],
      total: 21,
    });

    const result = await service.findAll(userId, {
      page: 2,
      limit: 20,
      status: OrderStatus.ASSIGNED,
    });

    expect(orderRepository.findAllByOwner).toHaveBeenCalledWith({
      userId,
      page: 2,
      limit: 20,
      status: OrderStatus.ASSIGNED,
      createdFrom: undefined,
      createdTo: undefined,
    });
    expect(result.totalPages).toBe(2);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.items).toHaveLength(1);
  });

  it('throws not found when truck cannot be updated while syncing order status', async () => {
    orderRepository.findByIdAndOwner.mockResolvedValue(
      createOrderDocument(OrderStatus.IN_TRANSIT),
    );
    orderRepository.updateStatusByIdAndOwner.mockResolvedValue(
      createOrderDocument(OrderStatus.DELIVERED),
    );
    truckRepository.updateStatus.mockResolvedValue(null);

    await expect(
      service.updateStatus(userId, orderId, { status: OrderStatus.DELIVERED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
