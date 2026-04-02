import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { IUserRepository } from '../users/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../users/repositories/user.repository.token';
import { AUTH_REPOSITORY } from './repositories/auth.repository.token';
import type { IAuthRepository } from './repositories/auth.repository.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthDocument } from './schemas/auth.schema';
import { envs } from 'src/config/envs.config';

export interface AuthRegisterResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AuthResponse extends AuthRegisterResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptSaltRounds: number;
  private readonly maxLoginAttempts: number;
  private readonly blockDurationMinutes: number;
  private readonly refreshTokenTtlDays: number;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
    private readonly jwtService: JwtService,
  ) {
    this.bcryptSaltRounds = envs.bcrypt_salt_rounds;
    this.maxLoginAttempts = envs.max_login_attempts;
    this.blockDurationMinutes = envs.block_duration_minutes;
    this.refreshTokenTtlDays = envs.refresh_token_ttl_days;
  }
  /**
   * Registra un nuevo usuario.
   * @param dto DTO con los datos del usuario a registrar.
   * @throws ConflictException si el email ya está registrado.
   * @throws HttpException si ocurre un error al crear el usuario o el registro de autenticación.
   * @returns La respuesta del usuario registrado.
   */
  async register(dto: RegisterDto): Promise<AuthRegisterResponse> {
    const email = dto.email.trim().toLowerCase();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);

    const user = await this.userRepository
      .create({
        email,
        firstName,
        lastName,
      })
      .catch((error: unknown) => {
        if (this.isDuplicateKeyError(error)) {
          throw new ConflictException('Email already registered');
        }
        throw error;
      });

    try {
      await this.authRepository.create({
        userId: user._id.toString(),
        password: passwordHash,
        maxLoginAttempts: this.maxLoginAttempts,
      });
    } catch (error: unknown) {
      await this.userRepository.deleteById(user._id.toString());
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Authentication record already exists');
      }
      throw error;
    }

    this.logger.log(`User registered with id=${user._id.toString()}`);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Inicia sesión para un usuario existente.
   * @param dto DTO con las credenciales de inicio de sesión.
   * @throws UnauthorizedException si las credenciales son inválidas.
   * @throws HttpException si la cuenta esta bloqueada temporalmente por intentos fallidos.
   * @returns La respuesta con los tokens de autenticacion.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const auth = await this.authRepository.findByUserId(
      user._id.toString(),
      true,
    );
    if (!auth?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.assertNotBlocked(auth, user._id.toString());

    const isPasswordValid = await bcrypt.compare(dto.password, auth.password);

    if (!isPasswordValid) {
      const updatedAuth = await this.authRepository.incrementLoginAttempts(
        user._id.toString(),
        this.blockDurationMinutes,
      );

      if (updatedAuth?.isBlocked) {
        this.logger.warn(
          `User blocked due to max attempts userId=${user._id.toString()}`,
        );
        throw new HttpException(
          'Account temporarily locked. Try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.resetLoginAttempts(user._id.toString());
    await this.authRepository.updateLastLogin(user._id.toString(), new Date());

    const tokens = await this.generateTokenPair(
      user._id.toString(),
      user.email,
    );
    await this.persistRefreshToken(user._id.toString(), tokens.refreshToken);

    this.logger.log(`User logged in successfully id=${user._id.toString()}`);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  /**
   * Actualiza los tokens de autenticacion utilizando un token de refresco valido.
   * @param dto DTO con el token de refresco.
   * @throws UnauthorizedException si el token es invalido, no coincide o ya expiro.
   * @returns La respuesta con los nuevos tokens de autenticacion.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponse> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: envs.jwt.refresh_secret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const auth = await this.authRepository.findByUserId(payload.sub, true);

    if (!auth?.refreshToken || !auth.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (auth.refreshTokenExpiresAt.getTime() <= Date.now()) {
      await this.authRepository.clearRefreshToken(payload.sub);
      throw new UnauthorizedException('Refresh token expired');
    }

    const refreshTokenMatches = await bcrypt.compare(
      dto.refreshToken,
      auth.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokenPair(
      user._id.toString(),
      user.email,
    );
    await this.persistRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  /**
   * Cierra la sesion de un usuario eliminando su refresh token persistido.
   * @param userId ID del usuario.
   * @throws Error si falla la limpieza del token en el repositorio.
   * @returns La respuesta con el mensaje de exito.
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.authRepository.clearRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * Verifica que el usuario no este bloqueado antes de continuar el login.
   * @param auth Documento de autenticacion del usuario.
   * @param userId ID del usuario.
   * @throws HttpException si la cuenta permanece bloqueada.
   * @returns Una promesa que se resuelve si el usuario puede continuar.
   */
  private async assertNotBlocked(
    auth: AuthDocument,
    userId: string,
  ): Promise<void> {
    if (!auth.isBlocked) {
      return;
    }

    if (!auth.blockedUntil || auth.blockedUntil.getTime() > Date.now()) {
      throw new HttpException(
        'Account temporarily locked. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.authRepository.resetLoginAttempts(userId);
  }

  /**
   * Genera un par de tokens JWT de acceso y refresco.
   * @param userId ID del usuario.
   * @param email Correo electronico del usuario.
   * @throws Error si ocurre un fallo al firmar los tokens.
   * @returns Un objeto con accessToken y refreshToken.
   */
  private async generateTokenPair(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: envs.jwt.access_secret,
        expiresIn: envs.jwt.access_expires_in as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: envs.jwt.refresh_secret,
        expiresIn: envs.jwt.refresh_expires_in as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }
  /**
   * Almacena el hash del token de refresco y su expiracion para un usuario.
   * @param userId ID del usuario.
   * @param refreshToken Token de refresco.
   * @throws Error si falla el hash del token o la persistencia en repositorio.
   * @returns Una promesa que se resuelve al completar la actualizacion.
   */
  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      this.bcryptSaltRounds,
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.authRepository.updateRefreshToken(
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
  }
  /**
   * Verifica si un error corresponde a una clave duplicada en MongoDB.
   * @param error Error a verificar.
   * @throws Error no aplica de forma explicita; solo evalua el valor recibido.
   * @returns true si el error es de clave duplicada, false en caso contrario.
   */
  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
