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
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Invalid or missing access token.',
  schema: {
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      path: '/api/orders',
      timestamp: '2026-04-02T12:00:00.000Z',
      requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
    },
  },
})
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Create a new order' })
  @ApiCreatedResponse({
    description: 'Order created successfully.',
    schema: {
      example: {
        id: '6610f3f6fb1e47461d7f7001',
        truckId: '6605e6c1f2f5f9f7d2f1a555',
        pickupId: '6608b021fb1e47461d7f2222',
        dropoffId: '6608b021fb1e47461d7f3333',
        status: 'CREATED',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
        truck: {
          id: '6605e6c1f2f5f9f7d2f1a555',
          plate: 'ABC123',
          model: 'Volvo FH16',
          color: 'Blue',
          year: '2023',
          capacityKg: 24000,
          status: 'AVAILABLE',
        },
        pickup: {
          id: '6608b021fb1e47461d7f2222',
          name: 'Pickup Hub',
          address: 'Address for PLACE-A',
          place_id: 'PLACE-A',
          latitude: 10.1234,
          longitude: -58.9876,
        },
        dropoff: {
          id: '6608b021fb1e47461d7f3333',
          name: 'Dropoff Hub',
          address: 'Address for PLACE-B',
          place_id: 'PLACE-B',
          latitude: 10.1234,
          longitude: -58.9876,
        },
        statusHistory: [
          {
            status: 'CREATED',
            changedAt: '2026-04-02T12:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or same pickup/dropoff locations.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Pickup and dropoff locations must differ',
        path: '/api/orders',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Truck or locations not found for authenticated user.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Truck not found',
        path: '/api/orders',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Truck is unavailable or already has an active order.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Truck already has an active order',
        path: '/api/orders',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @ApiOperation({ summary: 'List orders for authenticated user' })
  @ApiOkResponse({
    description: 'Orders list obtained.',
    schema: {
      example: {
        items: [
          {
            id: '6610f3f6fb1e47461d7f7001',
            truckId: '6605e6c1f2f5f9f7d2f1a555',
            pickupId: '6608b021fb1e47461d7f2222',
            dropoffId: '6608b021fb1e47461d7f3333',
            status: 'ASSIGNED',
            createdBy: '6605e6c1f2f5f9f7d2f1a123',
            truck: {
              id: '6605e6c1f2f5f9f7d2f1a555',
              plate: 'ABC123',
              model: 'Volvo FH16',
              color: 'Blue',
              year: '2023',
              capacityKg: 24000,
              status: 'UNAVAILABLE',
            },
            pickup: {
              id: '6608b021fb1e47461d7f2222',
              name: 'Pickup Hub',
              address: 'Address for PLACE-A',
              place_id: 'PLACE-A',
              latitude: 10.1234,
              longitude: -58.9876,
            },
            dropoff: {
              id: '6608b021fb1e47461d7f3333',
              name: 'Dropoff Hub',
              address: 'Address for PLACE-B',
              place_id: 'PLACE-B',
              latitude: 10.1234,
              longitude: -58.9876,
            },
            statusHistory: [
              {
                status: 'CREATED',
                changedAt: '2026-04-02T12:00:00.000Z',
              },
              {
                status: 'ASSIGNED',
                changedAt: '2026-04-02T12:03:00.000Z',
              },
            ],
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
    @Query() query: FindOrdersQueryDto,
  ) {
    return this.ordersService.findAll(userId, query);
  }

  @ApiOperation({ summary: 'Get order by id' })
  @ApiOkResponse({
    description: 'Order retrieved successfully.',
    schema: {
      example: {
        id: '6610f3f6fb1e47461d7f7001',
        truckId: '6605e6c1f2f5f9f7d2f1a555',
        pickupId: '6608b021fb1e47461d7f2222',
        dropoffId: '6608b021fb1e47461d7f3333',
        status: 'IN_TRANSIT',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
        truck: {
          id: '6605e6c1f2f5f9f7d2f1a555',
          plate: 'ABC123',
          model: 'Volvo FH16',
          color: 'Blue',
          year: '2023',
          capacityKg: 24000,
          status: 'UNAVAILABLE',
        },
        pickup: {
          id: '6608b021fb1e47461d7f2222',
          name: 'Pickup Hub',
          address: 'Address for PLACE-A',
          place_id: 'PLACE-A',
          latitude: 10.1234,
          longitude: -58.9876,
        },
        dropoff: {
          id: '6608b021fb1e47461d7f3333',
          name: 'Dropoff Hub',
          address: 'Address for PLACE-B',
          place_id: 'PLACE-B',
          latitude: 10.1234,
          longitude: -58.9876,
        },
        statusHistory: [
          {
            status: 'CREATED',
            changedAt: '2026-04-02T12:00:00.000Z',
          },
          {
            status: 'ASSIGNED',
            changedAt: '2026-04-02T12:03:00.000Z',
          },
          {
            status: 'IN_TRANSIT',
            changedAt: '2026-04-02T12:10:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Order id is invalid.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid order id',
        path: '/api/orders/invalid-id',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        path: '/api/orders/6610f3f6fb1e47461d7f7001',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Get(':id')
  findById(
    @CurrentUser('userId') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.findById(userId, orderId);
  }

  @ApiOperation({ summary: 'Update order status' })
  @ApiOkResponse({
    description: 'Order status updated successfully.',
    schema: {
      example: {
        id: '6610f3f6fb1e47461d7f7001',
        truckId: '6605e6c1f2f5f9f7d2f1a555',
        pickupId: '6608b021fb1e47461d7f2222',
        dropoffId: '6608b021fb1e47461d7f3333',
        status: 'DELIVERED',
        createdBy: '6605e6c1f2f5f9f7d2f1a123',
        truck: {
          id: '6605e6c1f2f5f9f7d2f1a555',
          plate: 'ABC123',
          model: 'Volvo FH16',
          color: 'Blue',
          year: '2023',
          capacityKg: 24000,
          status: 'AVAILABLE',
        },
        pickup: {
          id: '6608b021fb1e47461d7f2222',
          name: 'Pickup Hub',
          address: 'Address for PLACE-A',
          place_id: 'PLACE-A',
          latitude: 10.1234,
          longitude: -58.9876,
        },
        dropoff: {
          id: '6608b021fb1e47461d7f3333',
          name: 'Dropoff Hub',
          address: 'Address for PLACE-B',
          place_id: 'PLACE-B',
          latitude: 10.1234,
          longitude: -58.9876,
        },
        statusHistory: [
          {
            status: 'CREATED',
            changedAt: '2026-04-02T12:00:00.000Z',
          },
          {
            status: 'ASSIGNED',
            changedAt: '2026-04-02T12:03:00.000Z',
          },
          {
            status: 'IN_TRANSIT',
            changedAt: '2026-04-02T12:10:00.000Z',
          },
          {
            status: 'DELIVERED',
            changedAt: '2026-04-02T12:45:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or order id.',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'status must be one of the following values: CREATED, ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED',
        ],
        path: '/api/orders/invalid-id/status',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        path: '/api/orders/6610f3f6fb1e47461d7f7001/status',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Status transition is invalid or order is terminal.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Invalid status transition from CREATED to DELIVERED',
        path: '/api/orders/6610f3f6fb1e47461d7f7001/status',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Patch(':id/status')
  updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(userId, orderId, dto);
  }

  @ApiOperation({ summary: 'Delete order by id' })
  @ApiNoContentResponse({
    description: 'Order deleted successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Order id is invalid.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid order id',
        path: '/api/orders/invalid-id',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        path: '/api/orders/6610f3f6fb1e47461d7f7001',
        timestamp: '2026-04-02T12:00:00.000Z',
        requestId: '2f72c04f-c44a-4ef8-933e-989de6802d74',
      },
    },
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') orderId: string,
  ): Promise<void> {
    await this.ordersService.remove(userId, orderId);
  }
}
