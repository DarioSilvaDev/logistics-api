import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PaginatedQueryResult } from '../../../common/interfaces/pagination.interface';
import {
  CreateTruckRepositoryInput,
  FindTrucksByOwnerRepositoryInput,
  ITruckRepository,
} from './truck.repository.interface';
import { Truck, TruckDocument, TruckStatus } from '../schemas/truck.schema';

@Injectable()
export class TruckRepository implements ITruckRepository {
  constructor(
    @InjectModel(Truck.name)
    private readonly truckModel: Model<Truck>,
  ) {}

  async create(input: CreateTruckRepositoryInput): Promise<TruckDocument> {
    return this.truckModel.create(input);
  }

  async findByPlate(plate: string): Promise<TruckDocument | null> {
    return this.truckModel.findOne({ plate }).exec();
  }

  async findAllByOwner(
    input: FindTrucksByOwnerRepositoryInput,
  ): Promise<PaginatedQueryResult<TruckDocument>> {
    const query: {
      createdBy: string;
      status?: TruckStatus;
    } = {
      createdBy: input.userId,
    };

    if (input.status) {
      query.status = input.status;
    }

    const [items, total] = await Promise.all([
      this.truckModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .exec(),
      this.truckModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByIdAndOwner(
    id: string,
    userId: string,
  ): Promise<TruckDocument | null> {
    return this.truckModel.findOne({ _id: id, createdBy: userId }).exec();
  }

  async updateStatus(
    id: string,
    userId: string,
    status: TruckStatus,
  ): Promise<TruckDocument | null> {
    return this.truckModel
      .findOneAndUpdate(
        { _id: id, createdBy: userId },
        {
          $set: { status },
        },
        { new: true },
      )
      .exec();
  }
}
