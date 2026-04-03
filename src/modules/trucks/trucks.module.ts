import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { Truck, TruckSchema } from './schemas/truck.schema';
import { TrucksController } from './trucks.controller';
import { TrucksService } from './trucks.service';
import { TRUCK_REPOSITORY } from './repositories/truck.repository.token';
import { TruckRepository } from './repositories/truck.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Truck.name, schema: TruckSchema }]),
    forwardRef(() => OrdersModule),
  ],
  controllers: [TrucksController],
  providers: [
    TrucksService,
    {
      provide: TRUCK_REPOSITORY,
      useClass: TruckRepository,
    },
  ],
  exports: [TRUCK_REPOSITORY],
})
export class TrucksModule {}
