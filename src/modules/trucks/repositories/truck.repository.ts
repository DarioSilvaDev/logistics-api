import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateTruckRepositoryInput,
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

  async findAllByOwner(userId: string): Promise<TruckDocument[]> {
    return this.truckModel
      .find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .exec();
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
