import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SearchSupplierDto,
} from '../../application/dtos/supplier.dtos.js';
import {
  CreateSupplierUseCase,
  GetSupplierByIdUseCase,
  GetSuppliersUseCase,
  UpdateSupplierUseCase,
  DeleteSupplierUseCase,
} from '../../application/use-cases/supplier.use-cases.js';
import type { AuthenticatedRequest } from '../../../../shared/infrastructure/http/interfaces/authenticated-request.interface.js';

@ApiTags('Suppliers - Gestión de Proveedores')
@ApiBearerAuth()
@Controller('api/v1/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(
    private readonly createSupplier: CreateSupplierUseCase,
    private readonly getSupplierById: GetSupplierByIdUseCase,
    private readonly getSuppliers: GetSuppliersUseCase,
    private readonly updateSupplier: UpdateSupplierUseCase,
    private readonly deleteSupplier: DeleteSupplierUseCase,
  ) {}

  @ApiOperation({
    summary: 'Crear proveedor',
    description:
      'Registra un nuevo proveedor en la empresa del usuario autenticado. El NIT/RUT debe ser único por empresa.',
  })
  @Post()
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSupplierDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.createSupplier.execute({
      tenantId: req.user.tenantId,
      nitRut: dto.nitRut,
      businessName: dto.businessName,
      tradeName: dto.tradeName,
      contactName: dto.contactName,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
    });
  }

  @ApiOperation({
    summary: 'Listar proveedores',
    description:
      'Obtiene proveedores del tenant con búsqueda por nombre/razón social (mínimo 3 caracteres) y paginación.',
  })
  @Get()
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: SearchSupplierDto,
  ) {
    return this.getSuppliers.execute(
      req.user.tenantId,
      query.search,
      query.isActive,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiParam({ name: 'id', description: 'UUID del proveedor' })
  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.getSupplierById.execute(id, req.user.tenantId);
  }

  @ApiOperation({
    summary: 'Actualizar proveedor',
    description: 'Actualiza los datos de un proveedor existente.',
  })
  @ApiParam({ name: 'id', description: 'UUID del proveedor' })
  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.updateSupplier.execute({
      id,
      tenantId: req.user.tenantId,
      businessName: dto.businessName,
      tradeName: dto.tradeName,
      contactName: dto.contactName,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
    });
  }

  @ApiOperation({
    summary: 'Eliminar proveedor (Soft Delete)',
    description: 'Desactiva un proveedor sin eliminarlo físicamente.',
  })
  @ApiParam({ name: 'id', description: 'UUID del proveedor a desactivar' })
  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.deleteSupplier.execute(id, req.user.tenantId);
  }
}

