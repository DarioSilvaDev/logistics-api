import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Token de acceso invalido o ausente.',
  schema: {
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      path: '/api/users/me',
      timestamp: '2026-04-01T12:00:00.000Z',
      requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
    },
  },
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({
    description: 'Perfil del usuario obtenido exitosamente.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        path: '/api/users/me',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }
}
