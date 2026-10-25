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

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Correo electrónico registrado del usuario',
    example: 'owner@techsolutions.com',
  })
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  email: string;
}

export class ResetPasswordWithTokenDto {
  @ApiProperty({
    description: 'Token de recuperación recibido por correo',
    example: 'c6f37628-98e8-466d-8b01-9dc55d6480b5',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña para la cuenta',
    example: 'NuevaPassword123*',
  })
  @IsString()
  newPassword: string;
}

