import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: '6605e6c1f2f5f9f7d2f1a555',
    description: 'Truck identifier to assign to the order.',
  })
  @IsMongoId()
  truckId: string;

  @ApiProperty({
    example: '6608b021fb1e47461d7f2222',
    description: 'Pickup location identifier.',
  })
  @IsMongoId()
  pickupId: string;

  @ApiProperty({
    example: '6608b021fb1e47461d7f3333',
    description: 'Dropoff location identifier.',
  })
  @IsMongoId()
  dropoffId: string;
}
