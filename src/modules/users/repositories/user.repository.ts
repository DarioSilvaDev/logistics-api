import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateUserRepositoryInput,
  IUserRepository,
  UpdateUserRepositoryInput,
} from './user.repository.interface';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) { }

  async create(input: CreateUserRepositoryInput): Promise<UserDocument> {
    return this.userModel.create(input);
  }

  async findByEmail(
    email: string,
    includeDeleted = false,
  ): Promise<UserDocument | null> {
    if (includeDeleted) {
      return this.userModel.findOne({ email }).exec();
    }

    return this.userModel.findOne({ email, deletedAt: null }).exec();
  }

  async findById(
    id: string,
    includeDeleted = false,
  ): Promise<UserDocument | null> {
    if (includeDeleted) {
      return this.userModel.findById(id).exec();
    }

    return this.userModel.findOne({ _id: id, deletedAt: null }).exec();
  }

  async updateById(
    id: string,
    input: UpdateUserRepositoryInput,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          $set: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async softDeleteById(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          $set: {
            deletedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async reactivateById(
    id: string,
    input: UpdateUserRepositoryInput,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: { $ne: null } },
        {
          $set: {
            firstName: input.firstName,
            lastName: input.lastName,
            deletedAt: null,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }
}
