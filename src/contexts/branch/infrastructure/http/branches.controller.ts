import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/http/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../rbac/infrastructure/guards/roles.guard.js';
import { Roles } from '../../../rbac/infrastructure/decorators/roles.decorator.js';
import { CreateBranchDto, UpdateBranchDto } from './dtos/branch.dtos.js';
import {
  ListBranchesUseCase,
  GetBranchUseCase,
  CreateBranchUseCase,
  UpdateBranchUseCase,
  DeleteBranchUseCase,
} from '../../application/use-cases/branch.use-cases.js';
import type { AuthenticatedRequest } from '../../../../shared/infrastructure/http/interfaces/authenticated-request.interface.js';

@ApiTags('Branches - Sucursales')
@ApiBearerAuth()
@Controller('api/v1/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    private readonly listBranches: ListBranchesUseCase,
    private readonly getBranch: GetBranchUseCase,
    private readonly createBranch: CreateBranchUseCase,
    private readonly updateBranch: UpdateBranchUseCase,
    private readonly deleteBranch: DeleteBranchUseCase,
  ) {}

  @ApiOperation({ summary: 'Listar sucursales' })
  @Get()
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER')
  async getAll(@Request() req: AuthenticatedRequest) {
    return this.listBranches.execute(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Obtener sucursal por ID o Nombre' })
  @ApiParam({ name: 'identifier', description: 'UUID o nombre de la sucursal' })
  @Get(':identifier')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER')
  async getOne(
    @Param('identifier') identifier: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.getBranch.execute(req.user.tenantId, identifier);
  }

  @ApiOperation({ summary: 'Crear sucursal' })
  @Post()
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBranchDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.createBranch.execute({
      tenantId: req.user.tenantId,
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
      isActive: dto.isActive,
    });
  }

  @ApiOperation({ summary: 'Actualizar sucursal' })
  @ApiParam({ name: 'identifier', description: 'UUID o nombre de la sucursal' })
  @Patch(':identifier')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('identifier') identifier: string,
    @Body() dto: UpdateBranchDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.updateBranch.execute({
      tenantId: req.user.tenantId,
      identifier,
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
      isActive: dto.isActive,
    });
  }

  @ApiOperation({ summary: 'Eliminar sucursal (Soft Delete)' })
  @ApiParam({ name: 'identifier', description: 'UUID o nombre de la sucursal' })
  @Delete(':identifier')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('identifier') identifier: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.deleteBranch.execute(req.user.tenantId, identifier);
  }
}
