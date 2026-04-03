import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateOrderRepositoryInput,
  IOrderRepository,
  OrderStatusHistoryEntryInput,
} from './order.repository.interface';
import {
  ACTIVE_ORDER_STATUSES,
  Order,
  OrderDocument,
  OrderStatus,
} from '../schemas/order.schema';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
  ) {}

  async create(input: CreateOrderRepositoryInput): Promise<OrderDocument> {
    return this.orderModel.create(input);
  }

  async findAllByOwner(userId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByIdAndOwner(
    id: string,
    userId: string,
  ): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ _id: id, createdBy: userId }).exec();
  }

  async findActiveByTruck(
    truckId: string,
    excludeOrderId?: string,
  ): Promise<OrderDocument | null> {
    const query: {
      truckId: string;
      status: { $in: OrderStatus[] };
      _id?: { $ne: string };
    } = {
      truckId,
      status: { $in: ACTIVE_ORDER_STATUSES },
    };

    if (excludeOrderId) {
      query._id = { $ne: excludeOrderId };
    }

    return this.orderModel.findOne(query).exec();
  }

  async updateStatusByIdAndOwner(
    id: string,
    userId: string,
    status: OrderStatus,
    statusHistoryEntry: OrderStatusHistoryEntryInput,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findOneAndUpdate(
        { _id: id, createdBy: userId },
        {
          $set: { status },
          $push: { statusHistory: statusHistoryEntry },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
