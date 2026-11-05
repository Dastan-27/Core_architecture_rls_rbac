import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'NIT o RUT del proveedor',
    example: '800123456-1',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim())
  nitRut: string;

  @ApiProperty({
    description: 'Razón social del proveedor',
    example: 'Distribuidora Nacional SAS',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  businessName: string;

  @ApiPropertyOptional({
    description: 'Nombre comercial',
    example: 'DistriNacional',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  tradeName?: string | null;

  @ApiPropertyOptional({
    description: 'Nombre de la persona de contacto',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  contactName?: string | null;

  @ApiPropertyOptional({
    description: 'Teléfono del proveedor',
    example: '+573001234567',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Correo electrónico del proveedor',
    example: 'ventas@distrinacional.com',
  })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase() || null)
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Dirección del proveedor',
    example: 'Calle 45 # 12-30 Bogotá',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string | null;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({
    description: 'Razón social del proveedor',
    example: 'Distribuidora Nacional SAS',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Nombre comercial',
    example: 'DistriNacional',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  tradeName?: string | null;

  @ApiPropertyOptional({
    description: 'Nombre de la persona de contacto',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  contactName?: string | null;

  @ApiPropertyOptional({
    description: 'Teléfono del proveedor',
    example: '+573001234567',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Correo electrónico del proveedor',
    example: 'ventas@distrinacional.com',
  })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase() || null)
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Dirección del proveedor',
    example: 'Calle 45 # 12-30 Bogotá',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string | null;
}

export class SearchSupplierDto {
  @ApiPropertyOptional({
    description: 'Texto de búsqueda (mínimo 3 caracteres)',
    example: 'distri',
  })
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'El filtro de búsqueda debe tener al menos 3 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Número de página (desde 1)',
    example: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Registros por página (1-100)',
    example: 20,
    default: 20,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

