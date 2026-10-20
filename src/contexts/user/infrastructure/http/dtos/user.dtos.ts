import {
  IsString,
  IsEmail,
  Matches,
  IsIn,
  ValidateIf,
  IsOptional,
  Length,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre del usuario', example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Apellido del usuario', example: 'Pérez' })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Correo electrónico válido (debe terminar en .com)',
    example: 'juan.perez@techsolutions.com',
  })
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/, {
    message: 'El email debe ser válido y terminar obligatoriamente en .com',
  })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123*',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Tipo de documento (CC, CE, PASAPORTE)',
    enum: ['CC', 'CE', 'PASAPORTE'],
    example: 'CC',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => {
    if (typeof value !== 'string') return value;
    const clean = value.trim().toUpperCase();
    if (clean === 'C.C' || clean === 'CC') return 'CC';
    if (clean === 'PASAPORTE' || clean === 'PP') return 'PASAPORTE';
    return clean;
  })
  @IsIn(['CC', 'CE', 'PASAPORTE'], {
    message: 'El tipo de documento debe ser CC, CE o PASAPORTE',
  })
  documentType: string;

  @ApiProperty({
    description:
      'Número de documento (numérico max 11 para CC/CE, alfanumérico max 9 para PASAPORTE)',
    example: '1098765432',
  })
  @IsString()
  @ValidateIf((o) => o.documentType === 'CC' || o.documentType === 'CE')
  @Matches(/^[0-9]{1,11}$/, {
    message:
      'Para CC y CE, el documento debe ser solo números y máximo 11 caracteres',
  })
  @ValidateIf((o) => o.documentType === 'PASAPORTE')
  @Matches(/^[a-zA-Z0-9]{1,9}$/, {
    message:
      'Para PASAPORTE, el documento debe ser alfanumérico y máximo 9 caracteres',
  })
  documentNumber: string;

  @ApiProperty({
    description: 'Número de teléfono (solo números, exactamente 10 dígitos)',
    example: '3001234567',
  })
  @IsString()
  @Length(10, 10, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]{10}$/, {
    message:
      'El teléfono debe contener solo números y tener exactamente 10 dígitos',
  })
  phone: string;

  @ApiPropertyOptional({
    description:
      'Nombre de la sucursal (ej: Sede Principal Bogotá). Obligatorio para CASHIER y WAREHOUSE_MANAGER; omitido para OWNER.',
    example: 'Sede Principal Bogotá',
  })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiProperty({ description: 'Rol del usuario', example: 'CASHIER' })
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER'])
  role: string;

  @ApiPropertyOptional({
    description:
      'UUID de la empresa a la que pertenecerá el usuario (Opcional, exclusivo para rol OWNER). Si se omite, se usa la empresa del creador.',
    example: 'a1000000-0000-4000-8000-000000000001',
  })
  @IsUUID()
  @IsOptional()
  tenantId?: string;
}

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'Nombre completo',
    example: 'Pedro Alberto Cajero',
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '3009999999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'UUID de la sucursal',
    example: 'b1000000-0000-4000-8000-000000000001',
  })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    description:
      'UUID de la nueva empresa para transferir/reasignar al usuario (Opcional, exclusivo para rol OWNER).',
    example: 'a1000000-0000-4000-8000-000000000001',
  })
  @IsUUID()
  @IsOptional()
  tenantId?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'Estado activo/inactivo', example: false })
  isActive: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Nueva contraseña',
    example: 'NuevaPassword123*',
  })
  @IsString()
  newPassword: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'Nuevo rol', example: 'ADMIN' })
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER'])
  role: string;
}
