import { OrderDocument, OrderStatus } from '../schemas/order.schema';

export interface OrderStatusHistoryEntryInput {
  status: OrderStatus;
  changedAt: Date;
}

export interface CreateOrderRepositoryInput {
  createdBy: string;
  truckId: string;
  pickupId: string;
  dropoffId: string;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntryInput[];
}

export interface IOrderRepository {
  create(input: CreateOrderRepositoryInput): Promise<OrderDocument>;
  findAllByOwner(userId: string): Promise<OrderDocument[]>;
  findByIdAndOwner(id: string, userId: string): Promise<OrderDocument | null>;
  findActiveByTruck(
    truckId: string,
    excludeOrderId?: string,
  ): Promise<OrderDocument | null>;
  updateStatusByIdAndOwner(
    id: string,
    userId: string,
    status: OrderStatus,
    statusHistoryEntry: OrderStatusHistoryEntryInput,
  ): Promise<OrderDocument | null>;
}
