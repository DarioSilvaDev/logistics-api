import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    maxLength: 255,
    description: 'Correo electronico registrado.',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'StrongPass123',
    minLength: 8,
    maxLength: 72,
    description: 'Contrasena del usuario.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
