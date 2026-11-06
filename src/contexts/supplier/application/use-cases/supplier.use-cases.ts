import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SUPPLIER_REPOSITORY_PORT } from '../../domain/ports/supplier-repository.port.js';
import type {
  SupplierRepositoryPort,
  SupplierRow,
} from '../../domain/ports/supplier-repository.port.js';
import { Supplier } from '../../domain/models/supplier.entity.js';
import type { PaginatedResult } from '../../../../shared/domain/pagination.js';
import {
  SupplierNotFoundException,
  SupplierAlreadyExistsException,
  SupplierFilterTooShortException,
} from '../../domain/exceptions/supplier.exceptions.js';

export interface SupplierResponse {
  readonly id: string;
  readonly tenantId: string;
  readonly nitRut: string;
  readonly businessName: string;
  readonly tradeName: string | null;
  readonly contactName: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function mapSupplierRowToResponse(row: SupplierRow): SupplierResponse {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    nitRut: row.nit_rut,
    businessName: row.business_name,
    tradeName: row.trade_name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateSupplierCommand {
  readonly tenantId: string;
  readonly nitRut: string;
  readonly businessName: string;
  readonly tradeName?: string | null;
  readonly contactName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
}

export interface UpdateSupplierCommand {
  readonly id: string;
  readonly tenantId: string;
  readonly businessName?: string;
  readonly tradeName?: string | null;
  readonly contactName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
}

@Injectable()
export class CreateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepository: SupplierRepositoryPort,
  ) {}

  async execute(command: CreateSupplierCommand): Promise<Supplier> {
    const existing = await this.supplierRepository.findByNitRut(
      command.nitRut,
      command.tenantId,
    );
    if (existing) {
      throw new SupplierAlreadyExistsException(command.nitRut);
    }

    const supplier = Supplier.create({
      id: uuidv4(),
      tenantId: command.tenantId,
      nitRut: command.nitRut,
      businessName: command.businessName,
      tradeName: command.tradeName ?? null,
      contactName: command.contactName ?? null,
      phone: command.phone ?? null,
      email: command.email ?? null,
      address: command.address ?? null,
    });

    return this.supplierRepository.save(supplier);
  }
}

@Injectable()
export class GetSupplierByIdUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepository: SupplierRepositoryPort,
  ) {}

  async execute(id: string, tenantId: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(id, tenantId);
    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }
    return supplier;
  }
}

@Injectable()
export class GetSuppliersUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepository: SupplierRepositoryPort,
  ) {}

  async execute(
    tenantId: string,
    search?: string,
    isActive?: boolean,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<SupplierResponse>> {
    if (search && search.length < 3) {
      throw new SupplierFilterTooShortException();
    }

    const result = await this.supplierRepository.findAll(tenantId, {
      search,
      isActive,
      page,
      limit,
    });

    return {
      data: result.data.map(mapSupplierRowToResponse),
      meta: result.meta,
    };
  }
}

@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepository: SupplierRepositoryPort,
  ) {}

  async execute(command: UpdateSupplierCommand): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(
      command.id,
      command.tenantId,
    );
    if (!supplier) {
      throw new SupplierNotFoundException(command.id);
    }

    supplier.update({
      businessName: command.businessName,
      tradeName: command.tradeName,
      contactName: command.contactName,
      phone: command.phone,
      email: command.email,
      address: command.address,
    });

    await this.supplierRepository.update(supplier);
    return supplier;
  }
}

@Injectable()
export class DeleteSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepository: SupplierRepositoryPort,
  ) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const supplier = await this.supplierRepository.findById(id, tenantId);
    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }

    const deleted = await this.supplierRepository.softDelete(id, tenantId);
    if (!deleted) {
      throw new SupplierNotFoundException(id);
    }
  }
}

