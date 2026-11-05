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

@Module({
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

