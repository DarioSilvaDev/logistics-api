import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TruckStatus } from '../schemas/truck.schema';

export class CreateTruckDto {
  @ApiProperty({
    example: 'ABC123',
    minLength: 1,
    maxLength: 20,
    description: 'Unique truck plate.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plate: string;

  @ApiProperty({
    example: 'Volvo FH16',
    minLength: 1,
    maxLength: 120,
    description: 'Commercial truck model.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model: string;

  @ApiProperty({
    example: 'Blue',
    minLength: 1,
    maxLength: 50,
    description: 'Truck color.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  color: string;

  @ApiProperty({
    example: '2024',
    minLength: 4,
    maxLength: 4,
    description: 'Truck year in 4-digit format.',
  })
  @IsString()
  @Matches(/^\d{4}$/)
  year: string;

  @ApiPropertyOptional({
    example: 24000,
    minimum: 0,
    description: 'Load capacity in kilograms.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityKg?: number;

  @ApiPropertyOptional({
    enum: TruckStatus,
    default: TruckStatus.AVAILABLE,
    description: 'Initial truck status.',
  })
  @IsOptional()
  @IsEnum(TruckStatus)
  status?: TruckStatus;
}
