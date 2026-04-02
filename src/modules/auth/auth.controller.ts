import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Registrar un usuario' })
  @ApiCreatedResponse({
    description: 'Usuario registrado exitosamente.',
    schema: {
      example: {
        user: {
          id: '6605e6c1f2f5f9f7d2f1a123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email'],
        path: '/api/auth/register',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiConflictResponse({
    description: 'El email ya se encuentra registrado.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already registered',
        path: '/api/auth/register',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiCreatedResponse({
    description: 'Sesion iniciada exitosamente.',
    schema: {
      example: {
        user: {
          id: '6605e6c1f2f5f9f7d2f1a123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.token',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: ['password must be longer than or equal to 8 characters'],
        path: '/api/auth/login',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales invalidas.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        path: '/api/auth/login',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Cuenta bloqueada temporalmente por intentos fallidos.',
    schema: {
      example: {
        statusCode: 429,
        message: 'Account temporarily locked. Try again later.',
        path: '/api/auth/login',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Refrescar tokens de sesion' })
  @ApiCreatedResponse({
    description: 'Tokens renovados exitosamente.',
    schema: {
      example: {
        user: {
          id: '6605e6c1f2f5f9f7d2f1a123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.access.token',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.refresh.token',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: ['refreshToken must be longer than or equal to 10 characters'],
        path: '/api/auth/refresh',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token invalido o expirado.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid refresh token',
        path: '/api/auth/refresh',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @ApiOperation({ summary: 'Cerrar sesion' })
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: 'Sesion cerrada exitosamente.',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token de acceso invalido o ausente.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        path: '/api/auth/logout',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }
}
