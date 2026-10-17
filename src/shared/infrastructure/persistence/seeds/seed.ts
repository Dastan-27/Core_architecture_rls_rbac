import * as fs from 'node:fs';
import * as path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcrypt';

// ─── Cargar variables de entorno desde .env ──────────────────────────────────
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
    // Desactivar temporalmente RLS en esta sesión de seed para garantizar inserción limpia
    await client.query("SET LOCAL app.bypass_rls = 'on'").catch(() => {});

    // Asegurar que las políticas de RLS soporten el estándar del proyecto (app.bypass_rls = 'on')
    console.log(
      '🔒 Verificando y sincronizando políticas RLS con bypass_rls...',
    );
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'tenant_isolation_branches') THEN
          DROP POLICY tenant_isolation_branches ON branches;
          CREATE POLICY tenant_isolation_branches ON branches FOR ALL USING (
            (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
            OR (current_setting('app.bypass_rls', true) = 'on')
          );
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit') THEN
          DROP POLICY tenant_isolation_audit ON audit_logs;
          CREATE POLICY tenant_isolation_audit ON audit_logs FOR ALL USING (
            (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
            OR (current_setting('app.bypass_rls', true) = 'on')
          );
        END IF;
      END $$;
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. TENANTS (2 Empresas)
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BRANCHES (Sucursales para cada Tenant)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🏬 2. Sembrando Sucursales (Branches)...');
    const branches = [
      {
        id: 'b1000000-0000-4000-8000-000000000001',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        code: 'SUC-001',
        name: 'Sede Principal Bogotá',
        address: 'Calle 10 # 20-30 Piso 2',
        phone: '+573001234567',
      },
      {
        id: 'b1000000-0000-4000-8000-000000000002',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        code: 'SUC-002',
        name: 'Sede Norte Bogotá',
        address: 'Autopista Norte # 128-45',
        phone: '+573009876543',
      },
      {
        id: 'b2000000-0000-4000-8000-000000000001',
        tenant_id: 'a2000000-0000-4000-8000-000000000002',
        code: 'SUC-101',
        name: 'Sede Central Medellín',
        address: 'Carrera 43A # 1-50 Local 102',
        phone: '+573109876543',
      },
    ];

    for (const b of branches) {
      // Configurar el contexto del tenant para cumplir con la política RLS de branches
      await client.query(
        "SELECT set_config('app.current_tenant_id', $1, true), set_config('app.bypass_rls', 'on', true)",
        [b.tenant_id],
      );
      await client.query(
        `INSERT INTO branches (
          id, tenant_id, code, name, address, phone, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          is_active = true`,
        [b.id, b.tenant_id, b.code, b.name, b.address, b.phone],
      );
      console.log(
        `  ✓ Sucursal lista: ${b.name} (${b.code}) -> Tenant: ${b.tenant_id}`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. USUARIOS (Cada rol RBAC, 2 Owners, 1 Admin, etc.)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n👥 3. Sembrando Usuarios con Roles RBAC...');
    const defaultPasswordRaw = 'Password123*';
    const passwordHash = await bcrypt.hash(defaultPasswordRaw, 10);
    console.log(
      `  🔑 Contraseña universal para todos los usuarios: "${defaultPasswordRaw}"`,
    );

    const users = [
      // Tenant 1: Tech Solutions SAS
      {
        id: 'd1000000-0000-4000-8000-000000000001',
        tenant_id: 'a1000000-0000-4000-8000-000000000001',
        branch_id: 'b1000000-0000-4000-8000-000000000001',
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
        branch_id: 'b1000000-0000-4000-8000-000000000001',
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
        branch_id: 'b1000000-0000-4000-8000-000000000001',
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
        branch_id: 'b1000000-0000-4000-8000-000000000002',
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
        branch_id: 'b1000000-0000-4000-8000-000000000001',
        document_type: 'CC',
        document_number: '1010101005',
        email: 'cashier@techsolutions.com',
        full_name: 'Carolina Cajera',
        phone: '+573001110005',
        role: 'CASHIER',
      },

      // Tenant 2: Comercializadora Andina SAS (Segundo Owner para probar RLS)
      {
        id: 'd2000000-0000-4000-8000-000000000001',
        tenant_id: 'a2000000-0000-4000-8000-000000000002',
        branch_id: 'b2000000-0000-4000-8000-000000000001',
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
          id, tenant_id, branch_id, document_type, document_number, email, password_hash, full_name, phone, role, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        ON CONFLICT (tenant_id, email) DO UPDATE SET
          branch_id = EXCLUDED.branch_id,
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
          u.branch_id,
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

    // ─────────────────────────────────────────────────────────────────────────
    // 4. AUDIT LOGS (Registros iniciales de auditoría)
    // ─────────────────────────────────────────────────────────────────────────
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

runSeed();
