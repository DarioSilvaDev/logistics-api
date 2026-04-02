import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from './repositories/user.repository.interface';
import { USER_REPOSITORY } from './repositories/user.repository.token';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}
  /**
   * Obtiene el perfil de un usuario.
   * @param userId ID del usuario.
   * @throws NotFoundException si el usuario no existe.
   * @returns La respuesta con los datos del usuario.
   */
  async getProfile(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
