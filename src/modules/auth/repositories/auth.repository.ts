import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateAuthRepositoryInput,
  IAuthRepository,
} from './auth.repository.interface';
import { Auth, AuthDocument } from '../schemas/auth.schema';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @InjectModel(Auth.name)
    private readonly authModel: Model<Auth>,
  ) {}

  async create(input: CreateAuthRepositoryInput): Promise<AuthDocument> {
    return this.authModel.create({
      userId: input.userId,
      password: input.password,
      maxLoginAttempts: input.maxLoginAttempts,
    });
  }

  async findByUserId(
    userId: string,
    includeSecrets = false,
  ): Promise<AuthDocument | null> {
    const query = this.authModel.findOne({ userId });

    if (includeSecrets) {
      query.select('+password +refreshToken');
    }

    return query.exec();
  }

  async incrementLoginAttempts(
    userId: string,
    blockDurationMinutes: number,
  ): Promise<AuthDocument | null> {
    const auth = await this.authModel.findOne({ userId }).exec();

    if (!auth) {
      return null;
    }

    auth.loginAttempts += 1;

    if (auth.loginAttempts >= auth.maxLoginAttempts) {
      auth.isBlocked = true;
      auth.blockedUntil = new Date(
        Date.now() + blockDurationMinutes * 60 * 1000,
      );
    }

    await auth.save();
    return auth;
  }

  async resetLoginAttempts(userId: string): Promise<AuthDocument | null> {
    return this.authModel
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            loginAttempts: 0,
            isBlocked: false,
            blockedUntil: null,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async updateLastLogin(
    userId: string,
    date: Date,
  ): Promise<AuthDocument | null> {
    return this.authModel
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            lastLogin: date,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<AuthDocument | null> {
    return this.authModel
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            refreshToken: refreshTokenHash,
            refreshTokenExpiresAt,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.authModel
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            refreshToken: null,
            refreshTokenExpiresAt: null,
          },
        },
      )
      .exec();
  }
}
