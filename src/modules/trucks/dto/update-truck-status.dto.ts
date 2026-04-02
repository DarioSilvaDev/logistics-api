import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TruckStatus } from '../schemas/truck.schema';

export class UpdateTruckStatusDto {
  @ApiProperty({
    enum: TruckStatus,
    example: TruckStatus.IN_MAINTENANCE,
    description: 'Nuevo estado del truck.',
  })
  @IsEnum(TruckStatus)
  status: TruckStatus;
}
