import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsModule } from '../locations/locations.module';
import { TrucksModule } from '../trucks/trucks.module';
import { OrdersController } from './orders.controller';
import { ORDER_REPOSITORY } from './repositories/order.repository.token';
import { OrderRepository } from './repositories/order.repository';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    forwardRef(() => TrucksModule),
    LocationsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderRepository,
    },
  ],
  exports: [ORDER_REPOSITORY],
})
export class OrdersModule {}
