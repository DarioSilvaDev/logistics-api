import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IAuthRepository } from '../auth/repositories/auth.repository.interface';
import { AUTH_REPOSITORY } from '../auth/repositories/auth.repository.token';
import type { IUserRepository } from './repositories/user.repository.interface';
import { USER_REPOSITORY } from './repositories/user.repository.token';
import { UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
  ) {}
  /**
   * Obtiene el perfil de un usuario.
   * @param userId ID del usuario.
   * @throws NotFoundException si el usuario no existe.
   * @returns La respuesta con los datos del usuario.
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUser(user);
  }

  /**
   * Actualiza los datos basicos del perfil del usuario autenticado.
   * @param userId ID del usuario.
   * @param dto Datos de actualizacion del perfil.
   * @throws BadRequestException si el payload normalizado es invalido.
   * @throws NotFoundException si el usuario no existe.
   * @returns El perfil actualizado del usuario.
   */
  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserProfileResponse> {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    if (!firstName || !lastName) {
      throw new BadRequestException('Invalid user payload');
    }

    const user = await this.userRepository.updateById(userId, {
      firstName,
      lastName,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUser(user);
  }

  /**
   * Inactiva la cuenta del usuario autenticado y revoca su refresh token.
   * @param userId ID del usuario.
   * @throws NotFoundException si el usuario no existe.
   * @returns Una promesa que se resuelve cuando la cuenta queda inactiva.
   */
  async inactivateAccount(userId: string): Promise<void> {
    const user = await this.userRepository.softDeleteById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.authRepository.clearRefreshToken(userId);
  }

  /**
   * Convierte un documento de usuario a la respuesta publica del perfil.
   * @param user Documento del usuario.
   * @throws Error no aplica de forma explicita durante este mapeo.
   * @returns El perfil serializado del usuario.
   */
  private mapUser(user: UserDocument): UserProfileResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
