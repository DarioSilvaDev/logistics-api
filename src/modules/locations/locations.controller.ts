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
import { FindLocationsQueryDto } from './dto/find-locations-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Invalid or missing access token.',
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

  @ApiOperation({ summary: 'Create location' })
  @ApiCreatedResponse({
    description: 'Location created successfully.',
    schema: {
      example: {
        id: '6608b021fb1e47461d7f2222',
        name: 'North Distribution Center',
        address: '1234 Main St, Austin, TX, USA',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        latitude: -34.6037,
        longitude: -58.3816,
      },
    },
  })
  @ApiConflictResponse({
    description: 'Location already exists for authenticated user.',
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
    description: 'Invalid payload.',
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
    description: 'Error while calling Google Places.',
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

  @ApiOperation({ summary: 'List authenticated user locations' })
  @ApiOkResponse({
    description: 'Locations list retrieved successfully.',
    schema: {
      example: {
        items: [
          {
            id: '6608b021fb1e47461d7f2222',
            name: 'North Distribution Center',
            address: '1234 Main St, Austin, TX, USA',
            place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
            latitude: -34.6037,
            longitude: -58.3816,
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
    @Query() query: FindLocationsQueryDto,
  ) {
    return this.locationsService.findAll(userId, query);
  }

  @ApiOperation({ summary: 'Get location by id' })
  @ApiOkResponse({
    description: 'Location retrieved successfully.',
    schema: {
      example: {
        id: '6608b021fb1e47461d7f2222',
        name: 'North Distribution Center',
        address: '1234 Main St, Austin, TX, USA',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        latitude: -34.6037,
        longitude: -58.3816,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Location not found.',
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
    description: 'Invalid location id.',
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

  @ApiOperation({ summary: 'Update location name by id' })
  @ApiOkResponse({
    description: 'Location updated successfully.',
    schema: {
      example: {
        id: '6608b021fb1e47461d7f2222',
        name: 'North Distribution Center II',
        address: '1234 Main St, Austin, TX, USA',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        latitude: -34.6037,
        longitude: -58.3816,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Location not found.',
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
    description: 'Invalid payload or location id.',
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

  @ApiOperation({ summary: 'Delete location by id' })
  @ApiNoContentResponse({ description: 'Location deleted successfully.' })
  @ApiNotFoundResponse({
    description: 'Location not found.',
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
    description: 'Invalid location id.',
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
