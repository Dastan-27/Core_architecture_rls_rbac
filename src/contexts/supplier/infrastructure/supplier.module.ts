import { Module } from '@nestjs/common';
import { SUPPLIER_REPOSITORY_PORT } from '../domain/ports/supplier-repository.port.js';
import { PostgresSupplierRepository } from './persistence/postgres-supplier.repository.js';
import { SuppliersController } from './http/suppliers.controller.js';
import {
  CreateSupplierUseCase,
  GetSupplierByIdUseCase,
  GetSuppliersUseCase,
  UpdateSupplierUseCase,
  DeleteSupplierUseCase,
} from '../application/use-cases/supplier.use-cases.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { RbacModule } from '../../rbac/infrastructure/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [SuppliersController],
  providers: [
    {
      provide: SUPPLIER_REPOSITORY_PORT,
      useClass: PostgresSupplierRepository,
    },
    CreateSupplierUseCase,
    GetSupplierByIdUseCase,
    GetSuppliersUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
  ],
  exports: [SUPPLIER_REPOSITORY_PORT],
})
export class SupplierModule {}

