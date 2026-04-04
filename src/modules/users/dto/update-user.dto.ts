import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'John',
    minLength: 1,
    maxLength: 100,
    description: 'Updated user first name.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
    description: 'Updated user last name.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;
}
