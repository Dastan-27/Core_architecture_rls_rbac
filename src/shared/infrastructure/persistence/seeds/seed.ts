import * as fs from 'node:fs';
import * as path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcrypt';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const connectionString =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USERNAME ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'postgres'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? 5432}/${process.env.DB_DATABASE ?? 'core_rls_rbac'}`;

const isSsl =
  process.env.DB_SSL === 'true' || connectionString.includes('ssl=true');

const pool = new pg.Pool({
  connectionString,
  ssl: isSsl ? { rejectUnauthorized: false } : false,
});

async function runSeed() {
  const client = await pool.connect();
  console.log('🚀 Iniciando proceso de siembra (Seeding)...');
  console.log(
    `📡 Conectado a la BD: ${process.env.DB_DATABASE ?? 'PostgreSQL'}`,
  );

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL app.bypass_rls = 'on'").catch(() => {});

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id' AND table_schema = 'public'
        ) THEN
          DROP TABLE public.users CASCADE;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'tenant_id' AND table_schema = 'public'
        ) THEN
          DROP TABLE public.audit_logs CASCADE;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers' AND table_schema = 'public'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'tenant_id' AND table_schema = 'public'
        ) THEN
          DROP TABLE public.suppliers CASCADE;
        END IF;
      END $$;

      DROP TABLE IF EXISTS public.branches CASCADE;

      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY,
        nit_rut VARCHAR(50) NOT NULL UNIQUE,
        business_name VARCHAR(150) NOT NULL,
        trade_name VARCHAR(150),
        address VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(150),
        country_code VARCHAR(10) DEFAULT 'COL',
        currency_code VARCHAR(10) DEFAULT 'COP',
        tax_regime VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        document_type VARCHAR(20) NOT NULL DEFAULT 'CC',
        document_number VARCHAR(50),
        email VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_name VARCHAR(100),
        entity_id UUID,
        ip_address VARCHAR(50),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        nit_rut VARCHAR(20) NOT NULL,
        business_name VARCHAR(150) NOT NULL,
        trade_name VARCHAR(150),
        contact_name VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(150),
        address VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_suppliers_tenant_nit UNIQUE (tenant_id, nit_rut)
      );

      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
    `);

    console.log(
      '🔒 Verificando y sincronizando políticas RLS con bypass_rls...',
    );
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit') THEN
          DROP POLICY tenant_isolation_audit ON audit_logs;
          CREATE POLICY tenant_isolation_audit ON audit_logs FOR ALL USING (
            (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
            OR (current_setting('app.bypass_rls', true) = 'on')
          );
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'tenant_isolation_users') THEN
          DROP POLICY tenant_isolation_users ON users;
          CREATE POLICY tenant_isolation_users ON users FOR ALL USING (
            (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
            OR (current_setting('app.bypass_rls', true) = 'on')
            OR (current_setting('app.current_role', true) = 'OWNER')
          )
          WITH CHECK (
            (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
            OR (current_setting('app.bypass_rls', true) = 'on')
            OR (current_setting('app.current_role', true) = 'OWNER')
          );
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'tenant_isolation_suppliers') THEN
          DROP POLICY tenant_isolation_suppliers ON suppliers;
        END IF;
        CREATE POLICY tenant_isolation_suppliers ON suppliers FOR ALL USING (
          (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
          OR (current_setting('app.bypass_rls', true) = 'on')
        )
        WITH CHECK (
          (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
          OR (current_setting('app.bypass_rls', true) = 'on')
        );
      END $$;
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'CC';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_document_number ON users (document_number);
    `);

    console.log('\n🏢 1. Sembrando Tenants (2 Empresas)...');
    const tenants = [
      {
        id: 'a1000000-0000-4000-8000-000000000001',
        nit_rut: '900123456-1',
        business_name: 'Tech Solutions SAS',
        trade_name: 'TechStore Global',
        address: 'Calle 10 # 20-30 Bogotá',
        phone: '+573001234567',
        email: 'contacto@techsolutions.com',
        country_code: 'COL',
        currency_code: 'COP',
        tax_regime: 'RESPONSABLE_IVA',
      },
      {
        id: 'a2000000-0000-4000-8000-000000000002',
        nit_rut: '900987654-2',
        business_name: 'Comercializadora Andina SAS',
        trade_name: 'Andina Express',
        address: 'Carrera 43A # 1-50 Medellín',
        phone: '+573109876543',
        email: 'contacto@andina.com',
        country_code: 'COL',
        currency_code: 'COP',
        tax_regime: 'REGIMEN_SIMPLE',
      },
    ];

    for (const t of tenants) {
      await client.query(
        `INSERT INTO tenants (
          id, nit_rut, business_name, trade_name, address, phone, email, country_code, currency_code, tax_regime, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        ON CONFLICT (id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          trade_name = EXCLUDED.trade_name,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          country_code = EXCLUDED.country_code,
          currency_code = EXCLUDED.currency_code,
          tax_regime = EXCLUDED.tax_regime,
          is_active = true`,
        [
          t.id,
          t.nit_rut,
          t.business_name,
          t.trade_name,
          t.address,
          t.phone,
          t.email,
          t.country_code,
          t.currency_code,
          t.tax_regime,
        ],
      );
      console.log(`  ✓ Tenant listo: ${t.business_name} (${t.id})`);
    }

    console.log('\n👥 2. Sembrando Usuarios con Roles RBAC...');
    const defaultPasswordRaw = 'Password123*';
    const passwordHash = await bcrypt.hash(defaultPasswordRaw, 10);
    console.log(
      `  🔑 Contraseña universal para todos los usuarios: "${defaultPasswordRaw}"`,
    );

    const users = [
      {
        id: 'd1000000-0000-4000-8000-000000000001',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        document_type: 'CC',
        document_number: '1010101001',
        email: 'owner@techsolutions.com',
        full_name: 'Carlos Dueño Tech',
        phone: '+573001110001',
        role: 'OWNER',
      },
      {
        id: 'd1000000-0000-4000-8000-000000000002',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        document_type: 'CC',
        document_number: '1010101002',
        email: 'admin@techsolutions.com',
        full_name: 'Andrea Administradora',
        phone: '+573001110002',
        role: 'ADMIN',
      },
      {
        id: 'd1000000-0000-4000-8000-000000000003',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        document_type: 'CC',
        document_number: '1010101003',
        email: 'accountant@techsolutions.com',
        full_name: 'Camilo Contador',
        phone: '+573001110003',
        role: 'ACCOUNTANT',
      },
      {
        id: 'd1000000-0000-4000-8000-000000000004',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        document_type: 'CC',
        document_number: '1010101004',
        email: 'warehouse@techsolutions.com',
        full_name: 'William Bodeguero',
        phone: '+573001110004',
        role: 'WAREHOUSE_MANAGER',
      },
      {
        id: 'd1000000-0000-4000-8000-000000000005',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        document_type: 'CC',
        document_number: '1010101005',
        email: 'cashier@techsolutions.com',
        full_name: 'Carolina Cajera',
        phone: '+573001110005',
        role: 'CASHIER',
      },
      {
        id: 'd2000000-0000-4000-8000-000000000001',
        tenant_id: 'a2000000-0000-4000-8000-000000000002',
        document_type: 'CC',
        document_number: '2020202001',
        email: 'owner@andina.com',
        full_name: 'Mateo Dueño Andina',
        phone: '+573109990001',
        role: 'OWNER',
      },
    ];

    for (const u of users) {
      await client.query(
        "SELECT set_config('app.current_tenant_id', $1, true), set_config('app.bypass_rls', 'on', true)",
        [u.tenant_id],
      );
      await client.query(
        `INSERT INTO users (
          id, tenant_id, document_type, document_number, email, password_hash, full_name, phone, role, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (tenant_id, email) DO UPDATE SET
          document_type = EXCLUDED.document_type,
          document_number = EXCLUDED.document_number,
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          is_active = true`,
        [
          u.id,
          u.tenant_id,
          u.document_type,
          u.document_number,
          u.email,
          passwordHash,
          u.full_name,
          u.phone,
          u.role,
        ],
      );
      console.log(`  ✓ Usuario listo: [${u.role}] ${u.email} (${u.full_name})`);
    }

    console.log('\n📦 3. Sembrando Proveedores Iniciales...');
    const suppliers = [
      {
        id: 'e1000000-0000-4000-8000-000000000001',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        nit_rut: '900555111-1',
        business_name: 'Mayorista de Tecnología SAS',
        trade_name: 'TechMayorista',
        contact_name: 'Santiago Proveedor',
        phone: '+573005551111',
        email: 'ventas@techmayorista.com',
        address: 'Avenida 68 # 45-20 Bogotá',
      },
      {
        id: 'e2000000-0000-4000-8000-000000000001',
        tenant_id: 'a2000000-0000-4000-8000-000000000002',
        nit_rut: '900777222-2',
        business_name: 'Distribuidora Andina de Suministros SAS',
        trade_name: 'AndinaSupplies',
        contact_name: 'Mariana Proveedora',
        phone: '+573107772222',
        email: 'ventas@andinasupplies.com',
        address: 'Calle 10 Sur # 50-30 Medellín',
      },
    ];

    for (const s of suppliers) {
      await client.query(
        "SELECT set_config('app.current_tenant_id', $1, true), set_config('app.bypass_rls', 'on', true)",
        [s.tenant_id],
      );
      await client.query(
        `INSERT INTO suppliers (
          id, tenant_id, nit_rut, business_name, trade_name, contact_name, phone, email, address, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (id) DO UPDATE SET
          nit_rut = EXCLUDED.nit_rut,
          business_name = EXCLUDED.business_name,
          trade_name = EXCLUDED.trade_name,
          contact_name = EXCLUDED.contact_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          is_active = true`,
        [
          s.id,
          s.tenant_id,
          s.nit_rut,
          s.business_name,
          s.trade_name,
          s.contact_name,
          s.phone,
          s.email,
          s.address,
        ],
      );
      console.log(`  ✓ Proveedor listo: ${s.business_name} (${s.nit_rut}) -> Tenant: ${s.tenant_id}`);
    }

    console.log('\n📜 4. Sembrando Registros Iniciales de Auditoría...');
    const owner1Res = await client.query(
      "SELECT id FROM users WHERE email = 'owner@techsolutions.com' LIMIT 1",
    );
    const owner2Res = await client.query(
      "SELECT id FROM users WHERE email = 'owner@andina.com' LIMIT 1",
    );
    const owner1Id = owner1Res.rows[0]?.id ?? null;
    const owner2Id = owner2Res.rows[0]?.id ?? null;

    const auditLogs = [
      {
        id: 'c1000000-0000-4000-8000-000000000001',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        user_id: owner1Id,
        action: 'TENANT_SEEDED',
        entity_name: 'Tenant',
        entity_id: 'a1000000-0000-4000-8000-000000000001',
        ip_address: '127.0.0.1',
        user_agent: 'SeedScript/1.0',
        details: JSON.stringify({
          message: 'Semilla inicial creada con éxito',
        }),
      },
      {
        id: 'c2000000-0000-4000-8000-000000000002',
        tenant_id: 'a2000000-0000-4000-8000-000000000002',
        user_id: owner2Id,
        action: 'TENANT_SEEDED',
        entity_name: 'Tenant',
        entity_id: 'a2000000-0000-4000-8000-000000000002',
        ip_address: '127.0.0.1',
        user_agent: 'SeedScript/1.0',
        details: JSON.stringify({
          message: 'Semilla inicial creada con éxito',
        }),
      },
    ];

    for (const a of auditLogs) {
      await client.query(
        "SELECT set_config('app.current_tenant_id', $1, true), set_config('app.bypass_rls', 'on', true)",
        [a.tenant_id],
      );
      await client.query(
        `INSERT INTO audit_logs (
          id, tenant_id, user_id, action, entity_name, entity_id, ip_address, user_agent, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING`,
        [
          a.id,
          a.tenant_id,
          a.user_id,
          a.action,
          a.entity_name,
          a.entity_id,
          a.ip_address,
          a.user_agent,
          a.details,
        ],
      );
      console.log(`  ✓ Auditoría registrada: ${a.action} (${a.tenant_id})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ ¡SIEMBRA COMPLETADA CON ÉXITO!');
    console.log(
      '───────────────────────────────────────────────────────────────────',
    );
    console.log('📋 Resumen de Credenciales para Pruebas en Swagger:');
    console.log('Contraseña para todos los usuarios: Password123*\n');
    console.log('Tenant 1 (Tech Solutions SAS):');
    console.log('  • OWNER:             owner@techsolutions.com');
    console.log('  • ADMIN:             admin@techsolutions.com');
    console.log('  • ACCOUNTANT:        accountant@techsolutions.com');
    console.log('  • WAREHOUSE_MANAGER: warehouse@techsolutions.com');
    console.log('  • CASHIER:           cashier@techsolutions.com\n');
    console.log('Tenant 2 (Comercializadora Andina SAS - Para validar RLS):');
    console.log('  • OWNER:             owner@andina.com');
    console.log(
      '───────────────────────────────────────────────────────────────────',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la siembra:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void runSeed();
