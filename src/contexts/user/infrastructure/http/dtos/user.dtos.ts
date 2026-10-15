import {
  IsString, IsEmail, Matches, IsIn,
  ValidateIf, IsOptional, Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre del usuario' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Correo electrónico válido (debe terminar en .com)' })
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/, {
    message: 'El email debe ser válido y terminar obligatoriamente en .com',
  })
  email: string;

  @ApiProperty({ description: 'Contraseña del usuario' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Tipo de documento', enum: ['C.C', 'CE', 'PASAPORTE'] })
  @IsString()
  @IsIn(['C.C', 'CE', 'PASAPORTE'], {
    message: 'El tipo de documento debe ser C.C, CE o PASAPORTE',
  })
  @Transform(({ value }: { value: string }) => {
    const map: Record<string, string> = { 'C.C': 'CC', 'PASAPORTE': 'PP' };
    return map[value] ?? value;
  })
  documentType: string;

  @ApiProperty({ description: 'Número de documento (numérico max 11 para C.C/CE, alfanumérico max 9 para PASAPORTE)' })
  @IsString()
  @ValidateIf(o => o.documentType === 'C.C' || o.documentType === 'CE')
  @Matches(/^[0-9]{1,11}$/, {
    message: 'Para C.C y CE, el documento debe ser solo números y máximo 11 caracteres',
  })
  @ValidateIf(o => o.documentType === 'PASAPORTE')
  @Matches(/^[a-zA-Z0-9]{1,9}$/, {
    message: 'Para PASAPORTE, el documento debe ser alfanumérico y máximo 9 caracteres',
  })
  documentNumber: string;

  @ApiProperty({ description: 'Número de teléfono (solo números, exactamente 10 dígitos)', example: '3001234567' })
  @IsString()
  @Length(10, 10, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]{10}$/, {
    message: 'El teléfono debe contener solo números y tener exactamente 10 dígitos',
  })
  phone: string;

  @ApiPropertyOptional({ description: 'Nombre de la sucursal (ej: Sede Principal (Bogotá))' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiProperty({ description: 'Rol del usuario', example: 'CASHIER' })
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER'])
  role: string;
}

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'Nombre completo', example: 'Pedro Alberto Cajero' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '3009999999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'UUID de la sucursal', example: 'b2000000-0000-4000-8000-000000000001' })
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'Estado activo/inactivo', example: false })
  isActive: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Nueva contraseña', example: 'NuevaPass2026!' })
  @IsString()
  newPassword: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'Nuevo rol', example: 'ADMIN' })
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER'])
  role: string;
}
