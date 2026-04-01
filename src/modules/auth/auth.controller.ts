import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
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
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente.' })
  @ApiResponse({ status: 409, description: 'Email ya registrado.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Iniciar sesion con email y password' })
  @ApiResponse({ status: 201, description: 'Sesion iniciada exitosamente.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales invalidas.' })
  @ApiTooManyRequestsResponse({
    description: 'Cuenta bloqueada temporalmente.',
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Renovar token de acceso' })
  @ApiResponse({ status: 201, description: 'Tokens renovados exitosamente.' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token invalido o expirado.',
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @ApiOperation({ summary: 'Cerrar sesion del usuario autenticado' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Sesion cerrada exitosamente.' })
  @ApiUnauthorizedResponse({
    description: 'Token de acceso invalido o ausente.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }
}
