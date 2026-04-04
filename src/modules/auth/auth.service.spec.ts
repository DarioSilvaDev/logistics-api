jest.mock('src/config/envs.config', () => ({
  envs: {
    bcrypt_salt_rounds: 10,
    max_login_attempts: 5,
    block_duration_minutes: 15,
    refresh_token_ttl_days: 7,
    jwt: {
      access_secret: 'test-access-secret',
      refresh_secret: 'test-refresh-secret',
      access_expires_in: '15m',
      refresh_expires_in: '7d',
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn<Promise<string>, [string, string | number]>(),
  compare: jest.fn<Promise<boolean>, [string, string]>(),
}));

import {
  ConflictException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { IAuthRepository } from './repositories/auth.repository.interface';
import type { IUserRepository } from '../users/repositories/user.repository.interface';

describe('AuthService', () => {
  const userId = '507f1f77bcf86cd799439011';

  let service: AuthService;
  let userRepository: jest.Mocked<IUserRepository>;
  let authRepository: jest.Mocked<IAuthRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const bcryptHashMock = bcrypt.hash as unknown as jest.Mock<
    Promise<string>,
    [string, string | number]
  >;
  const bcryptCompareMock = bcrypt.compare as unknown as jest.Mock<
    Promise<boolean>,
    [string, string]
  >;

  const createUserDocument = (overrides: Partial<any> = {}) =>
    ({
      _id: { toString: () => userId },
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      deletedAt: null,
      ...overrides,
    }) as any;

  const createAuthDocument = (overrides: Partial<any> = {}) =>
    ({
      password: 'stored-password-hash',
      loginAttempts: 0,
      maxLoginAttempts: 5,
      isBlocked: false,
      blockedUntil: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      ...overrides,
    }) as any;

  beforeEach(() => {
    jest.resetAllMocks();

    userRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      softDeleteById: jest.fn(),
      reactivateById: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    authRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      updateLastLogin: jest.fn(),
      updateRefreshToken: jest.fn(),
      setPasswordAndResetSecurity: jest.fn(),
      clearRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<IAuthRepository>;

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    service = new AuthService(userRepository, authRepository, jwtService);
  });

  it('registers a new user with normalized data', async () => {
    const user = createUserDocument();

    userRepository.findByEmail.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed-password');
    userRepository.create.mockResolvedValue(user);
    authRepository.create.mockResolvedValue({} as any);

    const result = await service.register({
      email: '  JOHN.DOE@EXAMPLE.COM ',
      firstName: ' John ',
      lastName: ' Doe ',
      password: 'Password123!',
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'john.doe@example.com',
      true,
    );
    expect(userRepository.create).toHaveBeenCalledWith({
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(authRepository.create).toHaveBeenCalledWith({
      userId,
      password: 'hashed-password',
      maxLoginAttempts: 5,
    });
    expect(result).toEqual({
      user: {
        id: userId,
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
  });

  it('throws conflict when email is already registered', async () => {
    userRepository.findByEmail.mockResolvedValue(createUserDocument());

    await expect(
      service.register({
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(authRepository.create).not.toHaveBeenCalled();
  });

  it('reactivates user when email exists with deletedAt', async () => {
    userRepository.findByEmail.mockResolvedValue(
      createUserDocument({ deletedAt: new Date('2026-04-01T00:00:00.000Z') }),
    );
    bcryptHashMock.mockResolvedValue('new-hashed-password');
    authRepository.setPasswordAndResetSecurity.mockResolvedValue(
      createAuthDocument(),
    );
    userRepository.reactivateById.mockResolvedValue(createUserDocument());

    const result = await service.register({
      email: 'john.doe@example.com',
      firstName: ' John ',
      lastName: ' Doe ',
      password: 'Password123!',
    });

    expect(authRepository.setPasswordAndResetSecurity).toHaveBeenCalledWith(
      userId,
      'new-hashed-password',
    );
    expect(userRepository.reactivateById).toHaveBeenCalledWith(userId, {
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      user: {
        id: userId,
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
  });

  it('rolls back user creation when auth record creation fails with duplicate key', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed-password');
    userRepository.create.mockResolvedValue(createUserDocument());
    authRepository.create.mockRejectedValue({ code: 11000 });
    userRepository.deleteById.mockResolvedValue(undefined);

    await expect(
      service.register({
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
      }),
    ).rejects.toThrow('Authentication record already exists');

    expect(userRepository.deleteById).toHaveBeenCalledWith(userId);
  });

  it('returns 429 when account is currently blocked', async () => {
    userRepository.findByEmail.mockResolvedValue(createUserDocument());
    authRepository.findByUserId.mockResolvedValue(
      createAuthDocument({
        isBlocked: true,
        blockedUntil: new Date(Date.now() + 60_000),
      }),
    );

    try {
      await service.login({
        email: 'john.doe@example.com',
        password: 'Password123!',
      });
      fail('Expected login to throw for blocked account');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('resets expired block and completes login successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(createUserDocument());
    authRepository.findByUserId.mockResolvedValue(
      createAuthDocument({
        isBlocked: true,
        blockedUntil: new Date(Date.now() - 60_000),
      }),
    );
    bcryptCompareMock.mockResolvedValue(true);
    bcryptHashMock.mockResolvedValue('hashed-refresh-token');
    authRepository.resetLoginAttempts.mockResolvedValue({} as any);
    authRepository.updateLastLogin.mockResolvedValue({} as any);
    authRepository.updateRefreshToken.mockResolvedValue({} as any);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'john.doe@example.com',
      password: 'Password123!',
    });

    expect(authRepository.resetLoginAttempts).toHaveBeenCalledTimes(2);
    expect(authRepository.updateLastLogin).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
    );
    expect(authRepository.updateRefreshToken).toHaveBeenCalledWith(
      userId,
      'hashed-refresh-token',
      expect.any(Date),
    );
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe(userId);
  });

  it('increments attempts and returns 429 when bad password reaches block threshold', async () => {
    userRepository.findByEmail.mockResolvedValue(createUserDocument());
    authRepository.findByUserId.mockResolvedValue(createAuthDocument());
    bcryptCompareMock.mockResolvedValue(false);
    authRepository.incrementLoginAttempts.mockResolvedValue(
      createAuthDocument({ isBlocked: true }),
    );

    try {
      await service.login({
        email: 'john.doe@example.com',
        password: 'wrong-password',
      });
      fail('Expected login to throw when account becomes blocked');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    expect(authRepository.incrementLoginAttempts).toHaveBeenCalledWith(
      userId,
      15,
    );
    expect(authRepository.updateLastLogin).not.toHaveBeenCalled();
  });

  it('refreshes tokens when refresh token is valid', async () => {
    const user = createUserDocument();
    jwtService.verifyAsync.mockResolvedValue({
      sub: userId,
      email: 'john.doe@example.com',
    } as any);
    authRepository.findByUserId.mockResolvedValue(
      createAuthDocument({
        refreshToken: 'stored-refresh-hash',
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    );
    bcryptCompareMock.mockResolvedValue(true);
    userRepository.findById.mockResolvedValue(user);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    bcryptHashMock.mockResolvedValue('new-refresh-hash');
    authRepository.updateRefreshToken.mockResolvedValue({} as any);

    const result = await service.refreshToken({
      refreshToken: 'incoming-refresh-token',
    });

    expect(authRepository.clearRefreshToken).not.toHaveBeenCalled();
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.user.id).toBe(userId);
  });

  it('clears persisted refresh token when refresh token is expired', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: userId,
      email: 'john.doe@example.com',
    } as any);
    authRepository.findByUserId.mockResolvedValue(
      createAuthDocument({
        refreshToken: 'stored-refresh-hash',
        refreshTokenExpiresAt: new Date(Date.now() - 60_000),
      }),
    );
    authRepository.clearRefreshToken.mockResolvedValue(undefined);

    await expect(
      service.refreshToken({ refreshToken: 'incoming-refresh-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepository.clearRefreshToken).toHaveBeenCalledWith(userId);
  });

  it('logs out by clearing persisted refresh token', async () => {
    authRepository.clearRefreshToken.mockResolvedValue(undefined);

    const result = await service.logout(userId);

    expect(authRepository.clearRefreshToken).toHaveBeenCalledWith(userId);
    expect(result).toEqual({ message: 'Logged out successfully' });
  });
});
