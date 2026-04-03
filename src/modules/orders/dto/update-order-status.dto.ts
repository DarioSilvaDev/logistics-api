import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.ASSIGNED,
    description: 'New order status according to allowed transitions.',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
