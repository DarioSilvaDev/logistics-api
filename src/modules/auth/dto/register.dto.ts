import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    maxLength: 255,
    description: 'Correo electronico unico del usuario.',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Dario',
    minLength: 1,
    maxLength: 100,
    description: 'Nombre del usuario.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    example: 'Perez',
    minLength: 1,
    maxLength: 100,
    description: 'Apellido del usuario.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    example: 'StrongPass123',
    minLength: 8,
    maxLength: 72,
    description: 'Contrasena en texto plano para registro.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
