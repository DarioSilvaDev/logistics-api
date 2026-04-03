import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus } from '../schemas/order.schema';

export class FindOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter orders by status.',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-04-01T00:00:00.000Z',
    description: 'Filter orders created on or after this date.',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-04-30T23:59:59.999Z',
    description: 'Filter orders created on or before this date.',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
