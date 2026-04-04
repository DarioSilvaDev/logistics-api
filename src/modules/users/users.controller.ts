import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Invalid or missing access token.',
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
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({
    description: 'User profile retrieved successfully.',
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
    description: 'User not found.',
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
  @Get('me')
  getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiOkResponse({
    description: 'User profile updated successfully.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a123',
        email: 'john.doe@example.com',
        firstName: 'Johnny',
        lastName: 'Doe',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload.',
    schema: {
      example: {
        statusCode: 400,
        message: ['firstName must be longer than or equal to 1 characters'],
        path: '/api/users/me',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
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
  @Patch('me')
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @ApiOperation({ summary: 'Inactivate authenticated user account' })
  @ApiNoContentResponse({
    description: 'Account inactivated successfully.',
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
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
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async inactivateAccount(
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.usersService.inactivateAccount(userId);
  }
}
