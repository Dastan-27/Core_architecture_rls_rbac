import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico',
    example: 'owner@techsolutions.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contraseña', example: 'Password123*' })
  @IsString()
  password: string;
}

export class RefreshDto {
  @ApiProperty({
    description: 'Token de refresco',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}
