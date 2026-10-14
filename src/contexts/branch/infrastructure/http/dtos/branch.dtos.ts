import {
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ description: 'Nombre de la sucursal', maxLength: 20, example: 'Sucursal Oriente' })
  @IsString()
  @MaxLength(20, { message: 'El nombre no puede superar los 20 caracteres' })
  name: string;

  @ApiProperty({ description: 'Dirección de la sucursal', maxLength: 50, example: 'Carrera 15 #8-20' })
  @IsString()
  @MaxLength(50, { message: 'La dirección no puede superar los 50 caracteres' })
  address: string;

  @ApiProperty({ description: 'Teléfono (solo números, max 15 dígitos)', example: '3008887766' })
  @IsString()
  @Matches(/^[0-9]{1,15}$/, { message: 'El teléfono debe contener solo números y máximo 15 dígitos' })
  phone: string;

  @ApiProperty({ description: 'Indica si la sucursal está activa', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBranchDto {
  @ApiProperty({ description: 'Nombre de la sucursal', maxLength: 20, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El nombre no puede superar los 20 caracteres' })
  name?: string;

  @ApiProperty({ description: 'Dirección de la sucursal', maxLength: 50, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La dirección no puede superar los 50 caracteres' })
  address?: string;

  @ApiProperty({ description: 'Teléfono', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{1,15}$/, { message: 'El teléfono debe contener solo números y máximo 15 dígitos' })
  phone?: string;

  @ApiProperty({ description: 'Indica si la sucursal está activa', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
