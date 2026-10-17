import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BasePostgresRepository } from '../../../../shared/infrastructure/persistence/base-postgres.repository.js';
import type {
  TenantRepositoryPort,
  CreateTenantData,
  UpdateTenantData,
  DeactivateTenantResult,
} from '../../domain/ports/tenant-repository.port.js';
import { Tenant } from '../../domain/models/tenant.entity.js';

@Injectable()
export class PostgresTenantRepository
  extends BasePostgresRepository
  implements TenantRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async findById(id: string): Promise<Tenant | null> {
    const result = await this.queryFn('SELECT * FROM tenants WHERE id = $1', [
      id,
    ]);
    return result.length > 0 ? this.mapToEntity(result[0]) : null;
  }

  async findByNitRut(nitRut: string): Promise<Tenant | null> {
    const result = await this.queryFn(
      'SELECT * FROM tenants WHERE nit_rut = $1',
      [nitRut],
    );
    return result.length > 0 ? this.mapToEntity(result[0]) : null;
  }

  async create(data: CreateTenantData): Promise<Tenant> {
    const result = await this.queryFn(
      `INSERT INTO tenants (nit_rut, business_name, trade_name, address, phone, email, country_code, currency_code, tax_regime)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'COL'), COALESCE($8, 'COP'), COALESCE($9, 'REGIMEN_SIMPLE'))
       RETURNING *`,
      [
        data.nitRut,
        data.businessName,
        data.tradeName,
        data.address,
        data.phone,
        data.email,
        data.countryCode,
        data.currencyCode,
        data.taxRegime,
      ],
    );
    return this.mapToEntity(result[0]);
  }

  async update(id: string, data: UpdateTenantData): Promise<Tenant | null> {
    const result = await this.queryFn(
      `UPDATE tenants SET
        address       = COALESCE($1, address),
        phone         = COALESCE($2, phone),
        email         = COALESCE($3, email),
        trade_name    = COALESCE($4, trade_name),
        country_code  = COALESCE($5, country_code),
        currency_code = COALESCE($6, currency_code),
        tax_regime    = COALESCE($7, tax_regime),
        updated_at    = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        data.address,
        data.phone,
        data.email,
        data.tradeName,
        data.countryCode,
        data.currencyCode,
        data.taxRegime,
        id,
      ],
    );
    return result.length > 0 ? this.mapToEntity(result[0]) : null;
  }

  async softDelete(id: string): Promise<DeactivateTenantResult | null> {
    const result = await this.queryFn(
      `UPDATE tenants SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id, business_name, is_active`,
      [id],
    );
    if (result.length === 0) return null;
    return {
      id: result[0].id as string,
      businessName: result[0].business_name as string,
      isActive: result[0].is_active as boolean,
    };
  }

  private mapToEntity(row: Record<string, unknown>): Tenant {
    return new Tenant(
      row.id as string,
      row.nit_rut as string,
      row.business_name as string,
      row.trade_name as string,
      row.address as string,
      row.phone as string,
      row.email as string,
      row.country_code as string,
      row.currency_code as string,
      row.is_active as boolean,
      row.created_at as Date,
    );
  }
}
