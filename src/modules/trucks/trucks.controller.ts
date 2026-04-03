import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTruckDto } from './dto/create-truck.dto';
import { FindTrucksQueryDto } from './dto/find-trucks-query.dto';
import { UpdateTruckStatusDto } from './dto/update-truck-status.dto';
import { TrucksService } from './trucks.service';

@ApiTags('Trucks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Invalid or missing access token.',
  schema: {
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      path: '/api/trucks',
      timestamp: '2026-04-01T12:00:00.000Z',
      requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
    },
  },
})
@UseGuards(JwtAuthGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @ApiOperation({ summary: 'Create truck' })
  @ApiResponse({
    status: 201,
    description: 'Truck created successfully.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a555',
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Blue',
        year: '2024',
        capacityKg: 24000,
        status: 'AVAILABLE',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Truck plate already exists.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Truck plate already exists',
        path: '/api/trucks',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload.',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'year must have a length of 4 characters',
          'capacityKg must be a positive number',
        ],
        path: '/api/trucks',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateTruckDto) {
    return this.trucksService.create(userId, dto);
  }

  @ApiOperation({ summary: 'List authenticated user trucks' })
  @ApiResponse({
    status: 200,
    description: 'Trucks list retrieved successfully.',
    schema: {
      example: {
        items: [
          {
            id: '6605e6c1f2f5f9f7d2f1a555',
            plate: 'ABC123',
            model: 'Volvo FH16',
            color: 'Blue',
            year: '2024',
            capacityKg: 24000,
            status: 'AVAILABLE',
            createdBy: '6605e6c1f2f5f9f7d2f1a123',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  })
  @Get()
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: FindTrucksQueryDto,
  ) {
    return this.trucksService.findAll(userId, query);
  }

  @ApiOperation({ summary: 'Get truck by id' })
  @ApiResponse({
    status: 200,
    description: 'Truck retrieved successfully.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a555',
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Blue',
        year: '2024',
        capacityKg: 24000,
        status: 'AVAILABLE',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Truck not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Truck not found',
        path: '/api/trucks/6605e6c1f2f5f9f7d2f1a555',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid truck id.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid truck id',
        path: '/api/trucks/invalid-id',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Get(':id')
  findById(
    @CurrentUser('userId') userId: string,
    @Param('id') truckId: string,
  ) {
    return this.trucksService.findById(userId, truckId);
  }

  @ApiOperation({ summary: 'Update truck status' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a555',
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Blue',
        year: '2024',
        capacityKg: 24000,
        status: 'IN_MAINTENANCE',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Truck not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Truck not found',
        path: '/api/trucks/6605e6c1f2f5f9f7d2f1a555/status',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or truck id.',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'status must be one of the following values: AVAILABLE, UNAVAILABLE, IN_MAINTENANCE, INACTIVE',
        ],
        path: '/api/trucks/invalid-id/status',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Patch(':id/status')
  updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') truckId: string,
    @Body() dto: UpdateTruckStatusDto,
  ) {
    return this.trucksService.updateStatus(userId, truckId, dto);
  }

  @ApiOperation({ summary: 'Soft delete truck by id' })
  @ApiResponse({ status: 204, description: 'Truck deleted successfully.' })
  @ApiResponse({
    status: 404,
    description: 'Truck not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Truck not found',
        path: '/api/trucks/6605e6c1f2f5f9f7d2f1a555',
        timestamp: '2026-04-03T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Truck has active orders.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Truck has active orders',
        path: '/api/trucks/6605e6c1f2f5f9f7d2f1a555',
        timestamp: '2026-04-03T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid truck id.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid truck id',
        path: '/api/trucks/invalid-id',
        timestamp: '2026-04-03T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') truckId: string,
  ): Promise<void> {
    await this.trucksService.remove(userId, truckId);
  }
}
