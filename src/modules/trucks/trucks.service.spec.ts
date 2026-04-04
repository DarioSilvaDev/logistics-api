import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { IOrderRepository } from '../orders/repositories/order.repository.interface';
import { TrucksService } from './trucks.service';
import type { ITruckRepository } from './repositories/truck.repository.interface';
import { TruckStatus } from './schemas/truck.schema';

describe('TrucksService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const truckId = '507f1f77bcf86cd799439012';

  let service: TrucksService;
  let truckRepository: jest.Mocked<ITruckRepository>;
  let orderRepository: jest.Mocked<IOrderRepository>;

  const objectId = (value: string) => ({ toString: () => value });

  const createTruckDocument = () =>
    ({
      _id: objectId(truckId),
      plate: 'ABC123',
      model: 'Volvo',
      color: 'White',
      year: '2020',
      status: TruckStatus.AVAILABLE,
      createdBy: objectId(userId),
      deletedAt: null,
    }) as any;

  beforeEach(() => {
    truckRepository = {
      create: jest.fn(),
      findByPlate: jest.fn(),
      findAllByOwner: jest.fn(),
      findByIdAndOwner: jest.fn(),
      updateStatus: jest.fn(),
      softDeleteByIdAndOwner: jest.fn(),
    } as unknown as jest.Mocked<ITruckRepository>;

    orderRepository = {
      create: jest.fn(),
      findAllByOwner: jest.fn(),
      findByIdAndOwner: jest.fn(),
      findActiveByTruck: jest.fn(),
      updateStatusByIdAndOwner: jest.fn(),
    } as unknown as jest.Mocked<IOrderRepository>;

    service = new TrucksService(truckRepository, orderRepository);
  });

  it('throws bad request when truckId is invalid', async () => {
    await expect(service.remove(userId, 'invalid-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(truckRepository.findByIdAndOwner).not.toHaveBeenCalled();
  });

  it('throws not found when truck does not exist', async () => {
    truckRepository.findByIdAndOwner.mockResolvedValue(null);

    await expect(service.remove(userId, truckId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(orderRepository.findActiveByTruck).not.toHaveBeenCalled();
  });

  it('throws conflict when truck has active orders', async () => {
    truckRepository.findByIdAndOwner.mockResolvedValue(createTruckDocument());
    orderRepository.findActiveByTruck.mockResolvedValue({
      _id: objectId('1'),
    } as any);

    await expect(service.remove(userId, truckId)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(truckRepository.softDeleteByIdAndOwner).not.toHaveBeenCalled();
  });

  it('soft deletes truck when no active orders exist', async () => {
    truckRepository.findByIdAndOwner.mockResolvedValue(createTruckDocument());
    orderRepository.findActiveByTruck.mockResolvedValue(null);
    truckRepository.softDeleteByIdAndOwner.mockResolvedValue(
      createTruckDocument(),
    );

    await expect(service.remove(userId, truckId)).resolves.toBeUndefined();

    expect(orderRepository.findActiveByTruck).toHaveBeenCalledWith(truckId);
    expect(truckRepository.softDeleteByIdAndOwner).toHaveBeenCalledWith(
      truckId,
      userId,
    );
  });
});
