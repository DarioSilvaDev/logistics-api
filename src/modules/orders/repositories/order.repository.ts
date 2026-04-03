import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PaginatedQueryResult } from '../../../common/interfaces/pagination.interface';
import {
  CreateOrderRepositoryInput,
  FindOrdersByOwnerRepositoryInput,
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

  async findAllByOwner(
    input: FindOrdersByOwnerRepositoryInput,
  ): Promise<PaginatedQueryResult<OrderDocument>> {
    const query: {
      createdBy: string;
      status?: OrderStatus;
      createdAt?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {
      createdBy: input.userId,
    };

    if (input.status) {
      query.status = input.status;
    }

    if (input.createdFrom || input.createdTo) {
      query.createdAt = {};

      if (input.createdFrom) {
        query.createdAt.$gte = input.createdFrom;
      }

      if (input.createdTo) {
        query.createdAt.$lte = input.createdTo;
      }
    }

    const [items, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return { items, total };
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
