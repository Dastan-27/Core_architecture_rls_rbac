import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ description: 'Nuevo rol a asignar', example: 'ADMIN' })
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER'])
  role: string;
}
