import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    example: 'Centro de Distribucion Norte',
    minLength: 1,
    maxLength: 120,
    description: 'Nombre referencial de la ubicacion.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    minLength: 1,
    maxLength: 255,
    description: 'Identificador global de Google Places.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  place_id: string;
}
