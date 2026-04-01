import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token.signature',
    minLength: 10,
    description: 'Refresh token JWT vigente.',
  })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
