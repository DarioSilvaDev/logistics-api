import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PaginatedQueryResult } from '../../../common/interfaces/pagination.interface';
import {
  CreateLocationRepositoryInput,
  FindLocationsByOwnerRepositoryInput,
  ILocationRepository,
} from './location.repository.interface';
import { Location, LocationDocument } from '../schemas/location.schema';

@Injectable()
export class LocationRepository implements ILocationRepository {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<Location>,
  ) {}

  async create(
    input: CreateLocationRepositoryInput,
  ): Promise<LocationDocument> {
    return this.locationModel.create(input);
  }

  async findByPlaceIdAndOwner(
    placeId: string,
    userId: string,
  ): Promise<LocationDocument | null> {
    return this.locationModel
      .findOne({ place_id: placeId, createdBy: userId })
      .exec();
  }

  async findAllByOwner(
    input: FindLocationsByOwnerRepositoryInput,
  ): Promise<PaginatedQueryResult<LocationDocument>> {
    const query: {
      createdBy: string;
      name?: {
        $regex: string;
        $options: string;
      };
    } = {
      createdBy: input.userId,
    };

    if (input.name) {
      query.name = {
        $regex: input.name,
        $options: 'i',
      };
    }

    const [items, total] = await Promise.all([
      this.locationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .exec(),
      this.locationModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByIdAndOwner(
    id: string,
    userId: string,
  ): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ _id: id, createdBy: userId }).exec();
  }

  async updateNameByIdAndOwner(
    id: string,
    userId: string,
    name: string,
  ): Promise<LocationDocument | null> {
    return this.locationModel
      .findOneAndUpdate(
        { _id: id, createdBy: userId },
        {
          $set: { name },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
  }

  async deleteByIdAndOwner(
    id: string,
    userId: string,
  ): Promise<LocationDocument | null> {
    return this.locationModel
      .findOneAndDelete({ _id: id, createdBy: userId })
      .exec();
  }
}
