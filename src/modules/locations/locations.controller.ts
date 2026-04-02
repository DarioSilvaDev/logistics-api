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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Token de acceso invalido o ausente.',
  schema: {
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      path: '/api/locations',
      timestamp: '2026-04-01T12:00:00.000Z',
      requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
    },
  },
})
@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @ApiOperation({ summary: 'Crear una location' })
  @ApiCreatedResponse({
    description: 'Location creada exitosamente.',
    schema: {
      example: {
        id: '6608b021fb1e47461d7f2222',
        name: 'Centro de Distribucion Norte',
        address: 'Av. Corrientes 1234, CABA, Argentina',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        latitude: -34.6037,
        longitude: -58.3816,
      },
    },
  })
  @ApiConflictResponse({
    description: 'La location ya existe para el usuario autenticado.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Location already exists for this user',
        path: '/api/locations',
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
        message: ['place_id must be longer than or equal to 1 characters'],
        path: '/api/locations',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadGatewayResponse({
    description: 'Error al consultar Google Places.',
    schema: {
      example: {
        statusCode: 502,
        message: 'Google Places service unavailable',
        path: '/api/locations',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Listar locations del usuario autenticado' })
  @ApiOkResponse({
    description: 'Listado de locations obtenido.',
    schema: {
      type: 'array',
      example: [
        {
          id: '6608b021fb1e47461d7f2222',
          name: 'Centro de Distribucion Norte',
          address: 'Av. Corrientes 1234, CABA, Argentina',
          place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
          latitude: -34.6037,
          longitude: -58.3816,
        },
      ],
    },
  })
  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.locationsService.findAll(userId);
  }

  @ApiOperation({ summary: 'Obtener location por id' })
  @ApiOkResponse({
    description: 'Location obtenida exitosamente.',
    schema: {
      example: {
        id: '6608b021fb1e47461d7f2222',
        name: 'Centro de Distribucion Norte',
        address: 'Av. Corrientes 1234, CABA, Argentina',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        latitude: -34.6037,
        longitude: -58.3816,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Location no encontrada.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Location not found',
        path: '/api/locations/6608b021fb1e47461d7f2222',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Id de location invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid location id',
        path: '/api/locations/invalid-id',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Get(':id')
  findById(
    @CurrentUser('userId') userId: string,
    @Param('id') locationId: string,
  ) {
    return this.locationsService.findById(userId, locationId);
  }

  @ApiOperation({ summary: 'Actualizar nombre de location por id' })
  @ApiOkResponse({
    description: 'Location actualizada exitosamente.',
    schema: {
      example: {
        id: '6608b021fb1e47461d7f2222',
        name: 'Centro de Distribucion Norte II',
        address: 'Av. Corrientes 1234, CABA, Argentina',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        latitude: -34.6037,
        longitude: -58.3816,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Location no encontrada.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Location not found',
        path: '/api/locations/6608b021fb1e47461d7f2222',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload o id de location invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be longer than or equal to 1 characters'],
        path: '/api/locations/invalid-id',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Patch(':id')
  updateName(
    @CurrentUser('userId') userId: string,
    @Param('id') locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.updateName(userId, locationId, dto);
  }

  @ApiOperation({ summary: 'Eliminar location por id' })
  @ApiNoContentResponse({ description: 'Location eliminada exitosamente.' })
  @ApiNotFoundResponse({
    description: 'Location no encontrada.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Location not found',
        path: '/api/locations/6608b021fb1e47461d7f2222',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Id de location invalido.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid location id',
        path: '/api/locations/invalid-id',
        timestamp: '2026-04-01T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') locationId: string,
  ): Promise<void> {
    await this.locationsService.remove(userId, locationId);
  }
}
