import type { PaginatedQueryResult } from '../../../common/interfaces/pagination.interface';
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

export interface FindOrdersByOwnerRepositoryInput {
  userId: string;
  page: number;
  limit: number;
  status?: OrderStatus;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface IOrderRepository {
  create(input: CreateOrderRepositoryInput): Promise<OrderDocument>;
  findAllByOwner(
    input: FindOrdersByOwnerRepositoryInput,
  ): Promise<PaginatedQueryResult<OrderDocument>>;
  findByIdAndOwner(id: string, userId: string): Promise<OrderDocument | null>;
  findActiveByTruck(
    truckId: string,
    excludeOrderId?: string,
  ): Promise<OrderDocument | null>;
  findReservedByTruck(
    truckId: string,
    excludeOrderId?: string,
  ): Promise<OrderDocument | null>;
  updateStatusByIdAndOwner(
    id: string,
    userId: string,
    status: OrderStatus,
    statusHistoryEntry: OrderStatusHistoryEntryInput,
  ): Promise<OrderDocument | null>;
  deleteByIdAndOwner(id: string, userId: string): Promise<OrderDocument | null>;
}
