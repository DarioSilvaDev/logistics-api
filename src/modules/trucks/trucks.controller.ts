import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { UpdateTruckStatusDto } from './dto/update-truck-status.dto';
import { TrucksService } from './trucks.service';

@ApiTags('Trucks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Token de acceso invalido o ausente.',
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

  @ApiOperation({ summary: 'Crear un truck' })
  @ApiResponse({
    status: 201,
    description: 'Truck creado exitosamente.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a555',
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Azul',
        year: '2024',
        capacityKg: 24000,
        status: 'AVAILABLE',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'La placa ya existe.',
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
    description: 'Payload invalido.',
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

  @ApiOperation({ summary: 'Listar trucks del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Listado de trucks obtenido.',
    schema: {
      type: 'array',
      example: [
        {
          id: '6605e6c1f2f5f9f7d2f1a555',
          plate: 'ABC123',
          model: 'Volvo FH16',
          color: 'Azul',
          year: '2024',
          capacityKg: 24000,
          status: 'AVAILABLE',
          createdBy: '6605e6c1f2f5f9f7d2f1a123',
        },
      ],
    },
  })
  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.trucksService.findAll(userId);
  }

  @ApiOperation({ summary: 'Obtener truck por id' })
  @ApiResponse({
    status: 200,
    description: 'Truck obtenido exitosamente.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a555',
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Azul',
        year: '2024',
        capacityKg: 24000,
        status: 'AVAILABLE',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Truck no encontrado.',
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
    description: 'Id de truck invalido.',
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

  @ApiOperation({ summary: 'Actualizar estado de truck' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente.',
    schema: {
      example: {
        id: '6605e6c1f2f5f9f7d2f1a555',
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Azul',
        year: '2024',
        capacityKg: 24000,
        status: 'IN_MAINTENANCE',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Truck no encontrado.',
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
    description: 'Payload o id de truck invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'status must be one of the following values: AVAILABLE, IN_MAINTENANCE, INACTIVE',
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
}
