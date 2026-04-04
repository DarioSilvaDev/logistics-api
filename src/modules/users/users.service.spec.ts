import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { IUserRepository } from './repositories/user.repository.interface';
import type { IAuthRepository } from '../auth/repositories/auth.repository.interface';

describe('UsersService', () => {
  const userId = '507f1f77bcf86cd799439011';

  let service: UsersService;
  let userRepository: jest.Mocked<IUserRepository>;
  let authRepository: jest.Mocked<IAuthRepository>;

  const createUserDocument = () =>
    ({
      _id: { toString: () => userId },
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      deletedAt: null,
    }) as any;

  beforeEach(() => {
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

    service = new UsersService(userRepository, authRepository);
  });

  it('returns authenticated user profile', async () => {
    userRepository.findById.mockResolvedValue(createUserDocument());

    const result = await service.getProfile(userId);

    expect(result).toEqual({
      id: userId,
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('updates profile with trimmed values', async () => {
    userRepository.updateById.mockResolvedValue({
      ...createUserDocument(),
      firstName: 'Johnny',
      lastName: 'Doer',
    });

    const result = await service.updateProfile(userId, {
      firstName: ' Johnny ',
      lastName: ' Doer ',
    });

    expect(userRepository.updateById).toHaveBeenCalledWith(userId, {
      firstName: 'Johnny',
      lastName: 'Doer',
    });
    expect(result.firstName).toBe('Johnny');
    expect(result.lastName).toBe('Doer');
  });

  it('throws bad request when trimmed profile values are empty', async () => {
    await expect(
      service.updateProfile(userId, {
        firstName: '   ',
        lastName: 'Doe',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userRepository.updateById).not.toHaveBeenCalled();
  });

  it('inactivates account and clears refresh token', async () => {
    userRepository.softDeleteById.mockResolvedValue(createUserDocument());
    authRepository.clearRefreshToken.mockResolvedValue(undefined);

    await expect(service.inactivateAccount(userId)).resolves.toBeUndefined();

    expect(userRepository.softDeleteById).toHaveBeenCalledWith(userId);
    expect(authRepository.clearRefreshToken).toHaveBeenCalledWith(userId);
  });

  it('throws not found when inactivating missing user', async () => {
    userRepository.softDeleteById.mockResolvedValue(null);

    await expect(service.inactivateAccount(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(authRepository.clearRefreshToken).not.toHaveBeenCalled();
  });
});
