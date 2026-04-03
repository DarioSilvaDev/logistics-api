import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    example: 'North Distribution Center',
    minLength: 1,
    maxLength: 120,
    description: 'Reference name for the location.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    minLength: 1,
    maxLength: 255,
    description: 'Global Google Places identifier.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  place_id: string;
}
