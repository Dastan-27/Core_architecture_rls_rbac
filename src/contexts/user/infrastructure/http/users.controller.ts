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
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PASSWORD_HASHER_PORT } from '../../../auth/domain/ports/password-hasher.port.js';
import type { PasswordHasherPort } from '../../../auth/domain/ports/password-hasher.port.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/http/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../rbac/infrastructure/guards/roles.guard.js';
import { Roles } from '../../../rbac/infrastructure/decorators/roles.decorator.js';
import {
  CreateUserDto,
  UpdateUserProfileDto,
  UpdateUserStatusDto,
  ResetPasswordDto,
} from './dtos/user.dtos.js';
import { AssignRoleDto } from '../../../rbac/application/dtos/assign-role.dto.js';
import { AssignRoleUseCase } from '../../../rbac/application/use-cases/assign-role.use-case.js';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserProfileUseCase,
  UpdateUserStatusUseCase,
  ResetPasswordUseCase,
  DeleteUserUseCase,
} from '../../application/use-cases/user.use-cases.js';
import { GetBranchUseCase } from '../../../branch/application/use-cases/branch.use-cases.js';
import { GetUserAuditTrailUseCase } from '../../../audit/application/use-cases/get-user-audit-trail.use-case.js';
import { AuditQueryDto } from '../../../audit/application/dtos/audit-query.dto.js';
import type { Role } from '../../../rbac/domain/models/role.enum.js';
import type { AuthenticatedRequest } from '../../../../shared/infrastructure/http/interfaces/authenticated-request.interface.js';

@ApiTags('Users - Gestión de Usuarios')
@ApiBearerAuth()
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateProfile: UpdateUserProfileUseCase,
    private readonly updateStatus: UpdateUserStatusUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly deleteUser: DeleteUserUseCase,
    private readonly getBranch: GetBranchUseCase,
    private readonly assignRole: AssignRoleUseCase,
    private readonly getUserAuditTrail: GetUserAuditTrailUseCase,
  ) {}

  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Crea un nuevo usuario en el tenant actual.',
  })
  @Post()
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    let branchId: string | null = null;

    if (dto.branchName) {
      const branch = await this.getBranch.execute(
        req.user.tenantId,
        dto.branchName,
      );
      branchId = branch.id;
    }

    const fullName = `${dto.firstName} ${dto.lastName}`.trim();
    const passwordHash = await this.passwordHasher.hash(dto.password);

    return this.createUser.execute({
      tenantId: req.user.tenantId,
      branchId,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      email: dto.email,
      passwordHash,
      fullName,
      phone: dto.phone,
      role: dto.role as Role,
    });
  }

  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Obtiene todos los usuarios del tenant con filtros opcionales.',
  })
  @ApiQuery({ name: 'branch_id', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: String })
  @Get()
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('branch_id') branchId?: string,
    @Query('role') role?: string,
    @Query('is_active') isActive?: string,
  ) {
    return this.listUsers.execute(req.user.tenantId, {
      branchId,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'CASHIER')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.getUser.execute(id, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Actualizar perfil de usuario' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.updateProfile.execute({
      id,
      tenantId: req.user.tenantId,
      fullName: dto.fullName,
      phone: dto.phone,
      branchId: dto.branchId,
      requesterRole: req.user.role as Role,
    });
  }

  @ApiOperation({ summary: 'Activar/Desactivar usuario' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.updateStatus.execute({
      userId: id,
      tenantId: req.user.tenantId,
      isActive: dto.isActive,
      requesterRole: req.user.role as Role,
    });
    return { message: 'User status updated successfully' };
  }

  @ApiOperation({ summary: 'Resetear contraseña' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @Post(':id/reset-password')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const newHash = await this.passwordHasher.hash(dto.newPassword);
    await this.resetPassword.execute({
      id,
      tenantId: req.user.tenantId,
      newPasswordHash: newHash,
      requesterRole: req.user.role as Role,
    });
    return { message: 'Password reset successful' };
  }

  @ApiOperation({ summary: 'Eliminar usuario (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario a desactivar' })
  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.deleteUser.execute(id, req.user.tenantId, req.user.role as Role);
  }

  @ApiOperation({
    summary: 'Cambiar rol de usuario',
    description: 'Exclusivo para rol OWNER.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @Patch(':id/role')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async changeRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.assignRole.execute({
      userId: id,
      tenantId: req.user.tenantId,
      newRole: dto.role as Role,
      assignedByRole: req.user.role as Role,
    });
    return { message: 'User role updated successfully' };
  }

  @ApiOperation({
    summary: 'Audit-trail de un usuario',
    description:
      'Consulta la bitácora de auditoría de un usuario específico con paginación.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @Get(':id/audit-trail')
  @Roles('OWNER', 'ADMIN')
  async getAuditTrail(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query() query: AuditQueryDto,
  ) {
    return this.getUserAuditTrail.execute({
      userId: id,
      tenantId: req.user.tenantId,
      page: query.page,
      limit: query.limit,
    });
  }
}
