import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    example: 'Centro de Distribucion Norte II',
    minLength: 1,
    maxLength: 120,
    description: 'Nombre referencial actualizado de la ubicacion.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}
