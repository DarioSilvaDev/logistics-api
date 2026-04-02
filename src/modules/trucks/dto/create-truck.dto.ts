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
    description: 'Placa unica del truck.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plate: string;

  @ApiProperty({
    example: 'Volvo FH16',
    minLength: 1,
    maxLength: 120,
    description: 'Modelo comercial del truck.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model: string;

  @ApiProperty({
    example: 'Azul',
    minLength: 1,
    maxLength: 50,
    description: 'Color del truck.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  color: string;

  @ApiProperty({
    example: '2024',
    minLength: 4,
    maxLength: 4,
    description: 'Año del truck en formato de 4 digitos.',
  })
  @IsString()
  @Matches(/^\d{4}$/)
  year: string;

  @ApiPropertyOptional({
    example: 24000,
    minimum: 0,
    description: 'Capacidad de carga en kilogramos.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityKg?: number;

  @ApiPropertyOptional({
    enum: TruckStatus,
    default: TruckStatus.AVAILABLE,
    description: 'Estado inicial del truck.',
  })
  @IsOptional()
  @IsEnum(TruckStatus)
  status?: TruckStatus;
}
