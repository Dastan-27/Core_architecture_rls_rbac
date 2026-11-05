# 🔐 Seguridad: Row-Level Security (RLS) + Control de Acceso (RBAC)

> Este documento explica los dos mecanismos de seguridad centrales del sistema: el aislamiento de datos por empresa (RLS) y el control de acceso basado en roles (RBAC).

---

## 1. Row-Level Security (RLS) — Aislamiento Multi-Tenant

### ¿Qué problema resuelve?

En un sistema SaaS multi-empresa, múltiples organizaciones comparten la misma base de datos. Sin aislamiento, un usuario de la Empresa A podría ver o modificar los datos de la Empresa B.

**RLS** es una funcionalidad nativa de PostgreSQL que agrega filtros automáticos a nivel de fila. Cada consulta SQL se filtra invisiblemente por el `tenant_id` del usuario actual.

### ¿Cómo funciona en este proyecto?

#### Paso 1: Variables de sesión PostgreSQL

El sistema define 3 variables de sesión que PostgreSQL lee en cada query:

```typescript
// src/shared/infrastructure/persistence/rls/rls.constants.ts
export const RLS_VARIABLES = {
  USER_ID: 'app.current_user_id',      // UUID del usuario autenticado
  TENANT_ID: 'app.current_tenant_id',  // UUID de la empresa del usuario
  ROLE: 'app.current_role',            // Rol del usuario (OWNER, ADMIN, etc.)
};
```

#### Paso 2: El RlsInterceptor configura cada petición

Antes de ejecutar cualquier operación de base de datos, el `RlsInterceptor` (aplicado globalmente a todas las rutas protegidas):

1. **Abre una transacción** PostgreSQL dedicada.
2. **Ejecuta `SET LOCAL`** para establecer las variables de sesión:
   ```sql
   SELECT set_config('app.current_tenant_id', '<uuid-del-tenant>', true),
          set_config('app.current_user_id', '<uuid-del-usuario>', true),
          set_config('app.current_role', '<ROLE>', true);
   ```
3. **Propaga el QueryRunner** al `AsyncLocalStorage` (`RlsContext`).
4. Los repositorios usan ese QueryRunner automáticamente.
5. Al finalizar: **commit** (éxito) o **rollback** (error).

```
Petición HTTP autenticada
    │
    ▼
RlsInterceptor
    ├─ createQueryRunner()
    ├─ startTransaction()
    ├─ SET LOCAL app.current_tenant_id = '<tenant-uuid>'
    ├─ SET LOCAL app.current_user_id   = '<user-uuid>'
    ├─ SET LOCAL app.current_role      = '<ROLE>'
    ├─ RlsContext.run(queryRunner, () => ...)
    │      │
    │      ▼
    │   Controller → UseCase → Repository
    │      (cada query usa el queryRunner del contexto RLS)
    │
    ├─ COMMIT (si todo OK)
    └─ ROLLBACK (si hubo error)
```

#### Paso 3: Políticas RLS en PostgreSQL

Las tablas tienen políticas RLS que filtran automáticamente por `tenant_id`:

```sql
-- Ejemplo: política de aislamiento en la tabla 'users'
CREATE POLICY tenant_isolation_users ON users
FOR ALL USING (
    (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
    OR (current_setting('app.bypass_rls', true) = 'on')       -- Para seeds y migraciones
    OR (current_setting('app.current_role', true) = 'OWNER')  -- OWNER ve usuarios cross-tenant
)
WITH CHECK (
    (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
    OR (current_setting('app.bypass_rls', true) = 'on')
    OR (current_setting('app.current_role', true) = 'OWNER')
);

-- Política de aislamiento en la tabla 'branches'
CREATE POLICY tenant_isolation_branches ON branches
FOR ALL USING (
    (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
    OR (current_setting('app.bypass_rls', true) = 'on')
);

-- Política de aislamiento en la tabla 'audit_logs'
CREATE POLICY tenant_isolation_audit ON audit_logs
FOR ALL USING (
    (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
    OR (current_setting('app.bypass_rls', true) = 'on')
);
```

#### Paso 4: BasePostgresRepository transparente

Todos los repositorios extienden de `BasePostgresRepository`, que resuelve automáticamente el QueryRunner correcto:

```typescript
// src/shared/infrastructure/persistence/base-postgres.repository.ts
export abstract class BasePostgresRepository {
  constructor(protected readonly dataSource: DataSource) {}

  // Obtiene automáticamente el QueryRunner con RLS del contexto actual
  protected get queryFn() {
    const qr = RlsContext.getQueryRunner();
    return qr ? qr.query.bind(qr) : this.dataSource.query.bind(this.dataSource);
  }

  protected get entityManager(): EntityManager {
    return RlsContext.getEntityManager() ?? this.dataSource.manager;
  }
}
```

**Resultado:** Un desarrollador escribe `SELECT * FROM users` y PostgreSQL automáticamente retorna solo los usuarios del tenant actual. No es necesario agregar `WHERE tenant_id = ?` manualmente.

---

## 2. RBAC — Control de Acceso Basado en Roles

### Roles del Sistema

El sistema define 5 roles en orden jerárquico descendente:

```typescript
// src/contexts/rbac/domain/models/role.enum.ts
export const ROLES = [
  'OWNER',              // Dueño de la empresa — máxima autoridad
  'ADMIN',              // Administrador general
  'ACCOUNTANT',         // Contador — solo lectura operativa
  'WAREHOUSE_MANAGER',  // Jefe de bodega — acceso restringido
  'CASHIER',            // Cajero — acceso mínimo
] as const;

export type Role = (typeof ROLES)[number];
```

### Jerarquía Visual

```
   ┌────────────────────────────────────────────────────────┐
   │                         OWNER                          │
   │  • Control total, visión transversal                   │
   │  • branch_id = null (no está en una sucursal)          │
   └───────────────────────────┬────────────────────────────┘
                               │
   ┌───────────────────────────▼────────────────────────────┐
   │                         ADMIN                          │
   │  • Gestiona sucursales y usuarios operativos           │
   │  • NO puede tocar OWNER ni otros ADMIN                 │
   └───────────────────────────┬────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐      ┌─────▼──────┐      ┌──────▼──────┐
   │ ACCOUNTANT  │      │ WAREHOUSE_ │      │   CASHIER   │
   │             │      │  MANAGER   │      │             │
   │ • Solo      │      │ • Requiere │      │ • Requiere  │
   │   lectura   │      │   sucursal │      │   sucursal  │
   └─────────────┘      └────────────┘      └─────────────┘
```

### Reglas de Sucursal por Rol

| Rol | Sucursal (`branch_id`) |
|-----|----------------------|
| OWNER | `null` siempre — es transversal |
| ADMIN | Opcional |
| ACCOUNTANT | Opcional |
| WAREHOUSE_MANAGER | **Obligatoria** — lanza `BranchRequiredForRoleException` si falta |
| CASHIER | **Obligatoria** — lanza `BranchRequiredForRoleException` si falta |

### Cómo se aplica RBAC en los endpoints

#### 1. Decorador `@Roles()`

```typescript
// Ejemplo: solo OWNER y ADMIN pueden crear usuarios
@Post()
@Roles('OWNER', 'ADMIN')
async create(@Body() dto: CreateUserDto) { ... }
```

#### 2. `RolesGuard`

El guard intercepta la petición, lee los roles permitidos del decorador `@Roles()` y compara con el rol del JWT:

```
Request → JwtAuthGuard (extrae user del token) → RolesGuard (verifica rol) → Controller
```

Si el rol no está en la lista permitida: **403 Forbidden**.

#### 3. Blindaje adicional en casos de uso

Más allá del guard a nivel de controlador, los **casos de uso** aplican validaciones adicionales:

```typescript
// CreateUserUseCase — el ADMIN no puede crear OWNER ni ADMIN
if (command.requesterRole === 'ADMIN') {
  if (command.role === 'OWNER' || command.role === 'ADMIN') {
    throw new InsufficientPermissionsException(
      'ADMIN solo puede crear usuarios con roles ACCOUNTANT, WAREHOUSE_MANAGER o CASHIER'
    );
  }
}
```

```typescript
// AssignRoleUseCase — el ADMIN no puede tocar roles superiores
if (command.assignedByRole === 'ADMIN') {
  if (['OWNER', 'ADMIN'].includes(targetUser.role)) {
    throw new InsufficientPermissionsException(
      'ADMIN no puede modificar usuarios con rol OWNER o ADMIN'
    );
  }
  if (['OWNER', 'ADMIN'].includes(command.newRole)) {
    throw new InsufficientPermissionsException(
      'ADMIN solo puede asignar roles operativos'
    );
  }
}
```

---

## 3. Matriz de Permisos Completa

### Auth — Autenticación

| Método | Endpoint | OWNER | ADMIN | ACCOUNTANT | WAREHOUSE | CASHIER |
|--------|----------|:-----:|:-----:|:----------:|:---------:|:-------:|
| `POST` | `/api/v1/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST` | `/api/v1/auth/refresh` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST` | `/api/v1/auth/forgot-password` | ✅ público | ✅ público | ✅ público | ✅ público | ✅ público |
| `POST` | `/api/v1/auth/reset-password` | ✅ público | ✅ público | ✅ público | ✅ público | ✅ público |
| `POST` | `/api/v1/auth/logout` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET` | `/api/v1/auth/me` | ✅ | ✅ | ✅ | ✅ | ✅ |

### Tenants — Empresas

| Método | Endpoint | OWNER | ADMIN | ACCOUNTANT | WAREHOUSE | CASHIER |
|--------|----------|:-----:|:-----:|:----------:|:---------:|:-------:|
| `GET` | `/api/v1/tenants` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET` | `/api/v1/tenants/current` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET` | `/api/v1/tenants/:id` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `POST` | `/api/v1/tenants` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| `PATCH` | `/api/v1/tenants/current` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| `DELETE` | `/api/v1/tenants/current` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |

### Branches — Sucursales

| Método | Endpoint | OWNER | ADMIN | ACCOUNTANT | WAREHOUSE | CASHIER |
|--------|----------|:-----:|:-----:|:----------:|:---------:|:-------:|
| `GET` | `/api/v1/branches` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET` | `/api/v1/branches/:identifier` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST` | `/api/v1/branches` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| `PATCH` | `/api/v1/branches/:id` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| `DELETE` | `/api/v1/branches/:id` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |

### Users — Usuarios

| Método | Endpoint | OWNER | ADMIN | ACCOUNTANT | WAREHOUSE | CASHIER |
|--------|----------|:-----:|:-----:|:----------:|:---------:|:-------:|
| `GET` | `/api/v1/users` | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| `GET` | `/api/v1/users/:id` | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| `POST` | `/api/v1/users` | ✅ todos | ✅ solo operativos | ❌ 403 | ❌ 403 | ❌ 403 |
| `PATCH` | `/api/v1/users/:id` | ✅ | ✅ (salvo OWNER/ADMIN) | ❌ 403 | ❌ 403 | ❌ 403 |
| `PATCH` | `/api/v1/users/:id/status` | ✅ | ✅ (salvo OWNER/ADMIN) | ❌ 403 | ❌ 403 | ❌ 403 |
| `POST` | `/api/v1/users/:id/reset-password` | ✅ | ✅ (salvo OWNER/ADMIN) | ❌ 403 | ❌ 403 | ❌ 403 |
| `PATCH` | `/api/v1/users/:id/role` | ✅ todos | ✅ solo operativos | ❌ 403 | ❌ 403 | ❌ 403 |
| `DELETE` | `/api/v1/users/:id` | ✅ | ✅ (salvo OWNER/ADMIN) | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET` | `/api/v1/users/:id/audit-trail` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |

### Health Check

| Método | Endpoint | Acceso |
|--------|----------|--------|
| `GET` | `/health` | ✅ Público |
| `GET` | `/api/v1/health` | ✅ Público |

---

## 4. Blindajes de Seguridad Implementados

### 4.1 Anti-Escalación de Privilegios

| Escenario | Protección |
|-----------|-----------|
| ADMIN intenta crear un OWNER | Bloqueado en `CreateUserUseCase` |
| ADMIN intenta crear otro ADMIN | Bloqueado en `CreateUserUseCase` |
| ADMIN intenta asignar rol OWNER | Bloqueado en `AssignRoleUseCase` |
| ADMIN intenta modificar a un OWNER | Bloqueado en todos los use cases |
| Degradar el rol de un OWNER | Bloqueado en `User.assignRole()` (entidad de dominio) |

### 4.2 Aislamiento Cross-Tenant

| Escenario | Protección |
|-----------|-----------|
| Acceder a usuario de otro tenant | RLS filtra + validación `user.tenantId !== command.tenantId` → 404 |
| Acceder a sucursal de otro tenant | RLS filtra automáticamente |
| Acceder a logs de otro tenant | RLS filtra automáticamente |

### 4.3 Protección de Datos Personales

| Escenario | Protección |
|-----------|-----------|
| CASHIER intenta listar usuarios | 403 Forbidden (solo OWNER/ADMIN/ACCOUNTANT) |
| WAREHOUSE_MANAGER intenta ver nómina | 403 Forbidden |

### 4.4 Rate Limiting

| Endpoint | Límite | Tracking |
|----------|--------|----------|
| `POST /auth/login` | 5 req/min | Por email |
| `POST /auth/forgot-password` | 3 req/min | Por email |
| `POST /auth/reset-password` | 5 req/min | Por IP |

### 4.5 Anti-Enumeración de Usuarios

El endpoint `POST /auth/forgot-password` siempre retorna HTTP 200 con el mismo mensaje genérico, sin importar si el correo existe o no. Esto previene que un atacante descubra qué correos están registrados.
