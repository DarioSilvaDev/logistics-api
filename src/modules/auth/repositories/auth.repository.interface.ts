import { AuthDocument } from '../schemas/auth.schema';

export interface CreateAuthRepositoryInput {
  userId: string;
  password: string;
  maxLoginAttempts: number;
}

export interface IAuthRepository {
  create(input: CreateAuthRepositoryInput): Promise<AuthDocument>;
  findByUserId(
    userId: string,
    includeSecrets?: boolean,
  ): Promise<AuthDocument | null>;
  incrementLoginAttempts(
    userId: string,
    blockDurationMinutes: number,
  ): Promise<AuthDocument | null>;
  resetLoginAttempts(userId: string): Promise<AuthDocument | null>;
  updateLastLogin(userId: string, date: Date): Promise<AuthDocument | null>;
  updateRefreshToken(
    userId: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<AuthDocument | null>;
  clearRefreshToken(userId: string): Promise<void>;
}
