# 🗄️ Modelo de Datos

> Entidades de dominio, tablas PostgreSQL, atributos y relaciones del sistema **Core Architecture RLS & RBAC**.

---

## 1. Diagrama Entidad-Relación (ER)

```
┌──────────────────┐       1        ┌──────────────────┐       N        ┌──────────────────┐
│                  │────────────────▶│                  │◀───────────────│                  │
│     tenants      │                │     branches     │                │      users       │
│                  │                │                  │                │                  │
│  id (PK)         │                │  id (PK)         │                │  id (PK)         │
│  nit_rut         │                │  tenant_id (FK)  │                │  tenant_id (FK)  │
│  business_name   │                │  code            │                │  branch_id (FK)  │
│  trade_name      │                │  name            │                │  document_type   │
│  address         │                │  address         │                │  document_number │
│  phone           │                │  phone           │                │  email           │
│  email           │                │  is_active       │                │  password_hash   │
│  country_code    │                │  created_at      │                │  full_name       │
│  currency_code   │                │  updated_at      │                │  phone           │
│  tax_regime      │                │                  │                │  role            │
│  is_active       │                └──────────────────┘                │  is_active       │
│  created_at      │                                                    │  created_at      │
│                  │                                                    │  updated_at      │
└──────────────────┘                                                    └────────┬─────────┘
        │                                                                        │
        │ 1                                                                      │ N
        │                                                                        │
        ▼                                                                        ▼
┌──────────────────┐                                                    ┌──────────────────┐
│                  │                                                    │                  │
│   audit_logs     │                                                    │   (sesiones en   │
│                  │                                                    │    Redis)        │
│  id (PK)         │                                                    │                  │
│  tenant_id (FK)  │                                                    │  JWT tokens      │
│  user_id (FK)    │                                                    │  Refresh tokens  │
│  action          │                                                    │  Rate limit keys │
│  entity_name     │                                                    │  Password reset  │
│  entity_id       │                                                    │  tokens          │
│  ip_address      │                                                    │                  │
│  user_agent      │                                                    └──────────────────┘
│  details (JSONB) │
│  created_at      │
│                  │
└──────────────────┘
```

### Relaciones

| Relación | Tipo | Descripción |
|----------|------|-------------|
| `tenants` → `branches` | 1:N | Una empresa tiene muchas sucursales |
| `tenants` → `users` | 1:N | Una empresa tiene muchos usuarios |
| `branches` → `users` | 1:N | Una sucursal tiene muchos usuarios (opcional) |
| `tenants` → `audit_logs` | 1:N | Una empresa tiene muchos registros de auditoría |
| `users` → `audit_logs` | 1:N | Un usuario genera muchos registros de auditoría |

---

## 2. Tabla: `tenants` (Empresas)

Representa una empresa/organización dentro del sistema SaaS.

| Columna | Tipo | Restricción | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único de la empresa |
| `nit_rut` | VARCHAR | UNIQUE | Número de identificación tributaria |
| `business_name` | VARCHAR | NOT NULL | Razón social |
| `trade_name` | VARCHAR | | Nombre comercial |
| `address` | VARCHAR | | Dirección física |
| `phone` | VARCHAR | | Teléfono de contacto |
| `email` | VARCHAR | | Correo electrónico corporativo |
| `country_code` | VARCHAR(3) | DEFAULT 'COL' | Código ISO del país |
| `currency_code` | VARCHAR(3) | DEFAULT 'COP' | Código ISO de la moneda |
| `tax_regime` | VARCHAR | | Régimen tributario (RESPONSABLE_IVA, REGIMEN_SIMPLE) |
| `is_active` | BOOLEAN | DEFAULT true | Estado activo/inactivo (soft delete) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |

**Entidad de dominio:** `Tenant`

```typescript
class Tenant {
  id: string;
  nitRut: string;
  businessName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  countryCode: string;    // Default: 'COL'
  currencyCode: string;   // Default: 'COP'
  isActive: boolean;
  createdAt: Date;

  updateContactInfo(address, phone, email): void;
  deactivate(): void;
  activate(): void;
}
```

---

## 3. Tabla: `branches` (Sucursales)

Representa una sede física de una empresa. Protegida por RLS.

| Columna | Tipo | Restricción | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único de la sucursal |
| `tenant_id` | UUID | FK → tenants(id), NOT NULL | Empresa propietaria |
| `code` | VARCHAR | UNIQUE por tenant | Código de sucursal (ej: SUC-001) |
| `name` | VARCHAR | NOT NULL | Nombre de la sucursal |
| `address` | VARCHAR | | Dirección física |
| `phone` | VARCHAR | | Teléfono |
| `is_active` | BOOLEAN | DEFAULT true | Estado activo/inactivo |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Última actualización |

**RLS:** Filtrada por `tenant_id` del usuario autenticado.

**Entidad de dominio:** `Branch` (extiende `BaseTenantEntity`)

```typescript
class Branch extends BaseTenantEntity {
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;

  updateDetails(name, address, phone): void;
}
```

---

## 4. Tabla: `users` (Usuarios)

Representa un usuario del sistema. Protegida por RLS.

| Columna | Tipo | Restricción | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único del usuario |
| `tenant_id` | UUID | FK → tenants(id), NOT NULL | Empresa a la que pertenece |
| `branch_id` | UUID | FK → branches(id), NULLABLE | Sucursal asignada (null para OWNER) |
| `document_type` | VARCHAR | NOT NULL | Tipo de documento (CC, CE, NIT, TI, PAS) |
| `document_number` | VARCHAR | UNIQUE (global) | Número de documento |
| `email` | VARCHAR | UNIQUE por tenant | Correo electrónico |
| `password_hash` | VARCHAR | NOT NULL | Hash bcrypt de la contraseña |
| `full_name` | VARCHAR | NOT NULL | Nombre completo |
| `phone` | VARCHAR | | Teléfono personal |
| `role` | VARCHAR | NOT NULL | Rol RBAC (OWNER, ADMIN, etc.) |
| `is_active` | BOOLEAN | DEFAULT true | Estado activo/inactivo |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Última actualización |

**Constraints notables:**
- `UNIQUE(tenant_id, email)` — Un email es único dentro de cada empresa.
- `UNIQUE(document_number)` — El documento es único globalmente.

**RLS:** Filtrada por `tenant_id`, con excepción para rol OWNER (puede ver cross-tenant).

**Entidad de dominio:** `User` (extiende `BaseTenantEntity`)

```typescript
class User extends BaseTenantEntity {
  branchId: string | null;
  documentType: string;
  documentNumber: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;

  static create(props: UserProps): User;

  updateProfile(fullName, phone, branchId): void;
  transferToTenant(newTenantId, newBranchId?): void;
  assignRole(newRole: Role): void;           // Bloquea degradar OWNER
  changeStatus(isActive: boolean): void;
  resetPassword(newHash: string): void;
}
```

---

## 5. Tabla: `audit_logs` (Bitácora de Auditoría)

Registra acciones importantes del sistema para trazabilidad. Protegida por RLS.

| Columna | Tipo | Restricción | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único del registro |
| `tenant_id` | UUID | FK → tenants(id), NOT NULL | Empresa donde ocurrió la acción |
| `user_id` | UUID | FK → users(id), NULLABLE | Usuario que ejecutó la acción |
| `action` | VARCHAR | NOT NULL | Tipo de acción (TENANT_SEEDED, USER_CREATED, etc.) |
| `entity_name` | VARCHAR | NOT NULL | Nombre de la entidad afectada (Tenant, User, Branch) |
| `entity_id` | VARCHAR | NOT NULL | UUID de la entidad afectada |
| `ip_address` | VARCHAR | | Dirección IP del solicitante |
| `user_agent` | VARCHAR | | User-Agent del navegador/herramienta |
| `details` | JSONB | | Detalles adicionales de la acción |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha y hora de la acción |

**Entidad de dominio:** `AuditLog` (inmutable — solo se crea, nunca se modifica)

```typescript
class AuditLog {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string | null;
  readonly action: string;
  readonly entityName: string;
  readonly entityId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly details: Record<string, unknown>;
  readonly createdAt: Date;
}
```

---

## 6. Clase Base: `BaseTenantEntity`

Todas las entidades que pertenecen a un tenant extienden esta clase:

```typescript
abstract class BaseTenantEntity {
  readonly id: string;       // UUID
  tenantId: string;          // UUID de la empresa
  readonly createdAt: Date;  // Fecha de creación
  updatedAt: Date;           // Última actualización

  protected touch(): void {  // Actualiza updatedAt
    this.updatedAt = new Date();
  }
}
```

---

## 7. Datos Almacenados en Redis

Redis no tiene tablas formales, pero almacena estas estructuras de datos:

| Clave (patrón) | Tipo | TTL | Propósito |
|-----------------|------|-----|-----------|
| `session:<userId>:<jti>` | String | 1h | Sesión JWT activa |
| `refresh:<refreshToken>` | Hash | Configurable | Refresh token con datos del usuario |
| `pwd_reset:<token>` | String | 15min (900s) | Token temporal de recuperación de contraseña |
| `rate_limit:<endpoint>:<key>` | Counter | 60s | Contador de rate limiting por email/IP |
| `tenant_cache:<tenantId>` | Hash | Variable | Caché de datos del tenant |
