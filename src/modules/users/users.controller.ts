import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Perfil obtenido exitosamente.' })
  @ApiUnauthorizedResponse({
    description: 'Token de acceso invalido o ausente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiBadRequestResponse({ description: 'Solicitud invalida.' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }
}
