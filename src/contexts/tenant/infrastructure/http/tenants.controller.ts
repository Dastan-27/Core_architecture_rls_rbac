import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/http/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../rbac/infrastructure/guards/roles.guard.js';
import { Roles } from '../../../rbac/infrastructure/decorators/roles.decorator.js';
import { CreateTenantDto, UpdateTenantDto } from './dtos/tenant.dtos.js';
import {
  GetTenantUseCase,
  CreateTenantUseCase,
  UpdateTenantUseCase,
  DeactivateTenantUseCase,
} from '../../application/use-cases/tenant.use-cases.js';
import type { AuthenticatedRequest } from '../../../../shared/infrastructure/http/interfaces/authenticated-request.interface.js';

@ApiTags('Tenants - Informacion de la Empresa')
@ApiBearerAuth()
@Controller('api/v1/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(
    private readonly getTenant: GetTenantUseCase,
    private readonly createTenant: CreateTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly deactivateTenant: DeactivateTenantUseCase,
  ) { }

  @ApiOperation({ summary: 'Obtener mi empresa' })
  @Get('current')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER')
  async getCurrentTenant(@Request() req: AuthenticatedRequest) {
    return this.getTenant.execute(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Crear empresa' })
  @Post()
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  @ApiOperation({ summary: 'Actualizar empresa' })
  @Patch('current')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Body() dto: UpdateTenantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.updateTenant.execute(req.user.tenantId, dto);
  }

  @ApiOperation({ summary: 'Desactivar empresa (Soft Delete)' })
  @Delete('current')
  @Roles('OWNER')
  async delete(@Request() req: AuthenticatedRequest) {
    const result = await this.deactivateTenant.execute(req.user.tenantId);
    return { message: 'Empresa desactivada exitosamente.', tenant: result };
  }
}
