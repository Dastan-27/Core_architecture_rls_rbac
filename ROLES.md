# Manual de Roles, Permisos y Diagnóstico RBAC

Este documento describe detalladamente qué hace cada rol dentro del sistema **Core Architecture RLS & RBAC**, su matriz de permisos sobre los endpoints de la API, y el **análisis y estado de resolución de las reglas de negocio y seguridad**.

---

## 1. Definición de Roles del Sistema

El sistema implementa un modelo **RBAC (Role-Based Access Control)** definido en [`role.enum.ts`](file:///d:/ITP/Diplomado/ProyectoFInal/Core_architecture_rls_rbac/src/contexts/rbac/domain/models/role.enum.ts) con 5 roles:

```typescript
export const ROLES = [
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
  'WAREHOUSE_MANAGER',
  'CASHIER',
] as const;
```

### Jerarquía Conceptual del Sistema

```
   ┌────────────────────────────────────────────────────────┐
   │                         OWNER                          │  <- Máxima autoridad (Tenant)
   │  • Visión transversal a toda la empresa               │  • branch_id = null (Sin sucursal)
   │  • Control total sobre sucursales, admins y usuarios   │
   └───────────────────────────┬────────────────────────────┘
                               │
   ┌───────────────────────────▼────────────────────────────┐
   │                         ADMIN                          │  <- Administrador General
   │  • Asignado a la empresa (Tenant)                      │  • Gestiona sucursales
   │  • Crea y gestiona roles operativos subordinados       │  • NO puede crear/alterar al OWNER ni a otros ADMIN
   └───────────────────────────┬────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐      ┌──────▼───────┐     ┌──────▼──────┐
   │ ACCOUNTANT  │      │  WAREHOUSE_  │     │   CASHIER   │  <- Roles Operativos
   │ (Contador)  │      │   MANAGER    │     │  (Cajero)   │     (Confinados)
   │ • Lectura   │      │ • Sucursal   │     │ • Sucursal  │
   │   contable  │      │   obligatoria│     │   obligatoria
   └─────────────┘      └──────────────┘     └─────────────┘
```

---

## 2. ¿Qué hace cada Rol?

### 👑 `OWNER` (Propietario / Dueño de la Empresa)
Es la máxima autoridad dentro del tenant. Representa al titular legal o creador de la empresa.
* **Ámbito:** Transversal a toda la empresa. **NO está asignado a ninguna sucursal** (`branch_id = null`), pues su rol es supervisar y gobernar todas las sedes.
* **Gobierno de la Empresa:**
  * Consultar, modificar y desactivar (soft-delete) su empresa actual (`/api/v1/tenants/current`).
  * Listar todas las empresas (`GET /api/v1/tenants`) para obtener los IDs de todas las empresas creadas en el sistema.
  * Consultar cualquier empresa por su identificador UUID (`GET /api/v1/tenants/:id`).
  * Crear nuevas empresas (`POST /api/v1/tenants`).
* **Gestión de Sucursales:**
  * Crear, actualizar, consultar y eliminar sucursales (`/api/v1/branches`).
* **Gestión Total de Usuarios y Seguridad:**
  * Crear usuarios con cualquier rol (`OWNER`, `ADMIN`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`, `CASHIER`).
  * Asignar y cambiar roles de cualquier usuario subordinado (`PATCH /api/v1/users/:id/role`).
  * Activar / desactivar usuarios y resetear contraseñas de cualquier miembro del tenant.
  * Eliminar usuarios (soft-delete).
  * Consultar la bitácora de auditoría completa (`/api/v1/users/:id/audit-trail`).
* **Protección de Inmutabilidad:** Su propio rol no puede ser degradado en la entidad de dominio.

---

### 🛡️ `ADMIN` (Administrador General)
Responsable de la operación y supervisión administrativa diaria dentro de la empresa.
* **Ámbito:** Asignado a la empresa (Tenant).
* **Gestión de la Empresa:**
  * Consultar y actualizar datos de contacto de la empresa (`PATCH /api/v1/tenants/current`).
  * **Restricción:** NO puede desactivar la empresa (`DELETE /api/v1/tenants/current`) ni crear nuevas empresas.
* **Gestión de Sucursales:**
  * Crear, modificar, consultar y eliminar sucursales (`/api/v1/branches`).
* **Gestión de Usuarios Operativos:**
  * Puede crear usuarios **únicamente con roles operativos subordinados** (`ACCOUNTANT`, `WAREHOUSE_MANAGER`, `CASHIER`).
  * Modificar perfiles, cambiar estado (activo/inactivo), resetear contraseñas y eliminar usuarios subordinados.
  * Asignar roles operativos (`PATCH /api/v1/users/:id/role`) exclusivamente entre `ACCOUNTANT`, `WAREHOUSE_MANAGER` y `CASHIER`.
  * Consultar bitácora de auditoría de usuarios (`/api/v1/users/:id/audit-trail`).
* **Límites de Seguridad (Blindaje Jerárquico):**
  * **NO puede crear usuarios con rol `OWNER` ni con rol `ADMIN`**.
  * **NO puede modificar el perfil, estado, contraseña ni eliminar a un `OWNER` ni a otro `ADMIN`**.
  * **NO puede asignar ni revocar los roles `OWNER` ni `ADMIN`**.

---

### 📊 `ACCOUNTANT` (Contador)
Rol orientado a la gestión contable, financiera y tributaria.
* **En el Core Actual:**
  * Iniciar y cerrar sesión (`/api/v1/auth/login`, `/logout`).
  * Ver su propio perfil (`/api/v1/auth/me`).
  * Consultar la información del tenant actual (`GET /api/v1/tenants/current`).
  * Listar y consultar detalles de sucursales (`GET /api/v1/branches`).
  * Consultar el directorio de usuarios (`GET /api/v1/users` y `GET /api/v1/users/:id`) para fines de nómina y conciliación.
* **Restricción:** NO puede crear, editar ni eliminar sucursales, empresas ni usuarios.

---

### 📦 `WAREHOUSE_MANAGER` (Jefe de Almacén / Bodega)
Rol operativo responsable del control de existencias físicas y bodega.
* **Ámbito:** **Requiere obligatoriamente una sucursal asignada** (`branch_id`).
* **En el Core Actual:**
  * Iniciar y cerrar sesión (`/api/v1/auth/login`, `/logout`).
  * Consultar su propio perfil (`GET /api/v1/auth/me`), donde ve el nombre de su empresa y de su sucursal asignada.
  * Consultar información general de la empresa (`GET /api/v1/tenants/current`).
  * Listar sucursales (`GET /api/v1/branches`) para coordinación logística.
* **Restricción de Seguridad:** **NO tiene acceso al listado general de usuarios** (`GET /api/v1/users` retorna `403 Forbidden`) para proteger los datos personales de la nómina.

---

### 💳 `CASHIER` (Cajero / Punto de Venta)
Rol operativo de atención directa y cobro en mostrador.
* **Ámbito:** **Requiere obligatoriamente una sucursal asignada** (`branch_id`).
* **En el Core Actual:**
  * Iniciar y cerrar sesión (`/api/v1/auth/login`, `/logout`).
  * Consultar su propio perfil (`GET /api/v1/auth/me`), obteniendo su nombre, rol, nombre de la empresa y nombre de su sucursal.
  * Consultar la información básica del tenant (`GET /api/v1/tenants/current`) y consultar sucursales (`GET /api/v1/branches`).
* **Restricción de Seguridad:** **NO tiene acceso al listado general de usuarios** (`GET /api/v1/users` retorna `403 Forbidden`). Solo ve sus propios datos en `/auth/me`.

---

## 3. Matriz de Permisos por Endpoint

| Módulo | Método | Ruta | OWNER | ADMIN | ACCOUNTANT | WAREHOUSE_MANAGER | CASHIER |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **Auth** | `POST` | `/api/v1/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `POST` | `/api/v1/auth/refresh` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `POST` | `/api/v1/auth/logout` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `GET` | `/api/v1/auth/me` | ✅ *(con IDs)* | ✅ *(con IDs)* | ✅ *(básico)* | ✅ *(básico)* | ✅ *(básico)* |
| **Tenants** | `GET` | `/api/v1/tenants` | ✅ *(listar todas)* | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `GET` | `/api/v1/tenants/:id` | ✅ *(por ID)* | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `GET` | `/api/v1/tenants/current` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tenants** | `POST` | `/api/v1/tenants` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `PATCH` | `/api/v1/tenants/current` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `DELETE`| `/api/v1/tenants/current` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Branches**| `GET` | `/api/v1/branches` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Branches**| `GET` | `/api/v1/branches/:identifier` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Branches**| `POST` | `/api/v1/branches` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Branches**| `PATCH`| `/api/v1/branches/:id` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Branches**| `DELETE`| `/api/v1/branches/:id` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `GET` | `/api/v1/users` | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| **Users** | `GET` | `/api/v1/users/:id` | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| **Users** | `POST` | `/api/v1/users` | ✅ *(todos)* | ✅ *(solo operativos)* | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `PATCH`| `/api/v1/users/:id` | ✅ | ✅ *(salvo ADMIN/OWNER)* | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `PATCH`| `/api/v1/users/:id/status` | ✅ | ✅ *(salvo ADMIN/OWNER)* | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `POST` | `/api/v1/users/:id/reset-password` | ✅ | ✅ *(salvo ADMIN/OWNER)* | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `PATCH`| `/api/v1/users/:id/role` | ✅ *(todos)* | ✅ *(solo operativos)* | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `DELETE`| `/api/v1/users/:id` | ✅ | ✅ *(salvo ADMIN/OWNER)* | ❌ 403 | ❌ 403 | ❌ 403 |
| **Users** | `GET` | `/api/v1/users/:id/audit-trail` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Health** | `GET` | `/health` / `/api/v1/health` | ✅ *(público)* | ✅ | ✅ | ✅ | ✅ |

---

## 4. Estado de los Problemas y Correcciones Implementadas

---

### ✅ Problema 1: Blindaje contra Escalación de Privilegios de ADMIN — [RESUELTO]
* **Diagnóstico anterior:** `ADMIN` podía enviar `"role": "OWNER"` en `POST /api/v1/users` y crear un segundo dueño.
* **Solución aplicada:**
  * En [`CreateUserUseCase`](file:///d:/ITP/Diplomado/ProyectoFInal/Core_architecture_rls_rbac/src/contexts/user/application/use-cases/user.use-cases.ts), se incorporó la regla:
    ```typescript
    if (command.requesterRole === 'ADMIN') {
      if (command.role === 'OWNER' || command.role === 'ADMIN') {
        throw new InsufficientPermissionsException(
          'ADMIN solo puede crear usuarios con roles ACCOUNTANT, WAREHOUSE_MANAGER o CASHIER',
        );
      }
    }
    ```
  * Ahora el `ADMIN` solo puede crear roles operativos subordinados.

---

### ✅ Problema 2: Asignación de Roles en Controlador y Caso de Uso — [RESUELTO]
* **Diagnóstico anterior:** En [`users.controller.ts`](file:///d:/ITP/Diplomado/ProyectoFInal/Core_architecture_rls_rbac/src/contexts/user/infrastructure/http/users.controller.ts), el endpoint `PATCH /api/v1/users/:id/role` tenía `@Roles('OWNER')`, dejando como código muerto la lógica de `ADMIN` en [`AssignRoleUseCase`](file:///d:/ITP/Diplomado/ProyectoFInal/Core_architecture_rls_rbac/src/contexts/rbac/application/use-cases/assign-role.use-case.ts).
* **Solución aplicada:**
  * El endpoint se actualizó a `@Roles('OWNER', 'ADMIN')`.
  * En `AssignRoleUseCase`, se blindó para que `ADMIN` solo pueda alternar roles entre `ACCOUNTANT`, `WAREHOUSE_MANAGER` y `CASHIER`, prohibiéndole tocar o asignar `OWNER` o `ADMIN`.

---

### ✅ Problema 3: Blindaje de Aislamiento Multi-Tenant (RLS) en Usuarios — [RESUELTO]
* **Diagnóstico anterior:** `AssignRoleUseCase`, `UpdateUserProfileUseCase`, `UpdateUserStatusUseCase`, `ResetPasswordUseCase` y `DeleteUserUseCase` buscaban al usuario mediante `userRepository.findById(id)` sin comprobar que `user.tenantId === command.tenantId`.
* **Solución aplicada:**
  * En todos los casos de uso de usuario se agregó la validación estricta:
    ```typescript
    if (!user || user.tenantId !== command.tenantId) {
      throw new UserNotFoundException(command.id);
    }
    ```
  * Si un usuario de un tenant intenta operar sobre el UUID de otro tenant, el sistema responde con `404 Not Found` (protegiendo el aislamiento y evitando enumeración).

---

### ✅ Problema 4: Reglas de Sucursal por Rol (Transversal vs Operativo) — [RESUELTO]
* **Diagnóstico anterior:** El `OWNER` quedaba forzado o confundido con tener una sucursal asignada, mientras que cajeros y bodegueros podían crearse sin sucursal física.
* **Solución aplicada:**
  * **Para `OWNER`:** Al crear o editar un `OWNER`, el sistema descarta cualquier sucursal y asigna automáticamente `branch_id = null`. El Owner es transversal a toda la empresa.
  * **Para `CASHIER` y `WAREHOUSE_MANAGER`:** La sucursal es obligatoria. Si no se envía `branchName`, el sistema arroja la excepción de dominio `BranchRequiredForRoleException`.
  * **Para `ADMIN` y `ACCOUNTANT`:** La sucursal es opcional.

---

### ✅ Problema 5: Protección de Datos Personales de la Nómina — [RESUELTO]
* **Diagnóstico anterior:** `CASHIER` y `WAREHOUSE_MANAGER` tenían acceso a `GET /api/v1/users`, pudiendo extraer todas las cédulas, nombres, teléfonos y correos de la empresa.
* **Solución aplicada:**
  * `GET /api/v1/users` y `GET /api/v1/users/:id` ahora están restringidos exclusivamente a `@Roles('OWNER', 'ADMIN', 'ACCOUNTANT')`.
  * Los roles operativos (`CASHIER` y `WAREHOUSE_MANAGER`) reciben `403 Forbidden` y consultan su propia información de perfil y sede a través de `GET /api/v1/auth/me`.

---

### ✅ Problema 6: Obtención de IDs y Listado General de Empresas para OWNER — [RESUELTO]
* **Diagnóstico anterior:** Cuando un usuario creaba una empresa adicional mediante `POST /api/v1/tenants`, no podía consultar su ID desde `GET /api/v1/tenants/current` porque ese endpoint solo devuelve la empresa asociada al token de sesión JWT activo (`req.user.tenantId`).
* **Solución aplicada:**
  * Se crearon los endpoints:
    * `GET /api/v1/tenants`: Retorna la lista de todas las empresas activas registradas en el sistema con sus respectivos IDs (`tenant.id`), nombres, NIT, etc.
    * `GET /api/v1/tenants/:id`: Permite consultar el detalle de cualquier empresa específica por su UUID.
  * Ambos endpoints están protegidos exclusivamente con `@Roles('OWNER')`. Los demás roles reciben `403 Forbidden`.

---

### 📌 Notas de Arquitectura a Futuro:

1. **Multi-Empresa por Usuario (N:M):**
   * Actualmente cada registro de usuario pertenece a un solo `tenant_id` (modelo 1:N).
   * Para permitir que un mismo usuario administre varias empresas sin credenciales duplicadas, se requerirá en el futuro desacoplar la identidad global (`accounts`) de la membresía (`tenant_memberships`).
