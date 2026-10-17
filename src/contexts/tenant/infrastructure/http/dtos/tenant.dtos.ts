import {
  IsString,
  IsEmail,
  Matches,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: '900123456-1' })
  @IsString()
  @MaxLength(20)
  nitRut: string;

  @ApiProperty({ example: 'Mi Empresa S.A.S' })
  @IsString()
  @MaxLength(150)
  businessName: string;

  @ApiProperty({ example: 'Mi Tienda' })
  @IsString()
  @MaxLength(150)
  tradeName: string;

  @ApiProperty({ example: 'Cra 10 #20-30, Bogota' })
  @IsString()
  @MaxLength(200)
  address: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @Matches(/^[0-9]{7,10}$/, {
    message:
      'El telefono debe contener solo numeros y tener entre 7 y 10 digitos',
  })
  phone: string;

  @ApiProperty({ example: 'contacto@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'COL', required: false })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  countryCode?: string;

  @ApiProperty({ example: 'COP', required: false })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  currencyCode?: string;

  @ApiProperty({
    enum: [
      'REGIMEN_SIMPLE',
      'RESPONSABLE_IVA',
      'NO_RESPONSABLE_IVA',
      'GRAN_CONTRIBUYENTE',
      'REGIMEN_ESPECIAL',
    ],
    required: false,
  })
  @IsString()
  @IsIn([
    'REGIMEN_SIMPLE',
    'RESPONSABLE_IVA',
    'NO_RESPONSABLE_IVA',
    'GRAN_CONTRIBUYENTE',
    'REGIMEN_ESPECIAL',
  ])
  @IsOptional()
  taxRegime?: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(150) tradeName?: string;
  @IsOptional() @IsString() @MaxLength(3) countryCode?: string;
  @IsOptional() @IsString() @MaxLength(3) currencyCode?: string;
  @IsOptional() @IsString() taxRegime?: string;
}
