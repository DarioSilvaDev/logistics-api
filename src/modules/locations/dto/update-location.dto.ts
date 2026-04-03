import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    example: 'North Distribution Center II',
    minLength: 1,
    maxLength: 120,
    description: 'Updated reference name for the location.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}
