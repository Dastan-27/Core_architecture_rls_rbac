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
   │  • Visión transversal a toda la empresa                │  • Una sola empresa por cliente
   │  • Control total sobre proveedores, admins y usuarios │
   └───────────────────────────┬────────────────────────────┘
                               │
   ┌───────────────────────────▼────────────────────────────┐
   │                         ADMIN                          │  <- Administrador General
   │  • Asignado a la empresa (Tenant)                      │  • Gestiona proveedores y usuarios
   │  • Crea y gestiona roles operativos subordinados       │  • NO puede crear/alterar al OWNER ni a otros ADMIN
   └───────────────────────────┬────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐      ┌──────▼───────┐     ┌──────▼──────┐
   │ ACCOUNTANT  │      │  WAREHOUSE_  │     │   CASHIER   │  <- Roles Operativos
   │ (Contador)  │      │   MANAGER    │     │  (Cajero)   │     (Confinados al Tenant)
   │ • Lectura   │      │ • Operaciones│     │ • Ventas    │
   │   contable y│      │   de bodega  │     │   y caja    │
   │   proveedores      └──────────────┘     └─────────────┘
   └─────────────┘
```

---

## 2. ¿Qué hace cada Rol?

### 👑 `OWNER` (Propietario / Dueño de la Empresa)
Es la máxima autoridad dentro del tenant. Representa al titular legal o creador de la empresa.
* **Ámbito:** Transversal a toda la empresa. Posee el control total y gobierno de la organización.
* **Gobierno de la Empresa:**
  * Consultar, modificar y desactivar (soft-delete) su empresa actual (`/api/v1/tenants/current`).
  * Listar todas las empresas (`GET /api/v1/tenants`) para obtener los IDs de todas las empresas creadas en el sistema.
  * Consultar cualquier empresa por su identificador UUID (`GET /api/v1/tenants/:id`).
  * Crear nuevas empresas (`POST /api/v1/tenants`).
* **Gestión de Proveedores:**
  * Crear, actualizar, consultar y eliminar proveedores (`/api/v1/suppliers`).
  * Búsqueda y filtrado por nombre con mínimo 3 letras (`GET /api/v1/suppliers?search=xxx`).
* **Gestión Total de Usuarios y Seguridad:**
  * Crear usuarios con cualquier rol (`OWNER`, `ADMIN`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`, `CASHIER`) en su empresa actual o en cualquier empresa del sistema mediante `tenantId`.
  * Transferir y reasignar usuarios (incluyendo otros Owners) a cualquier empresa registrada (`PATCH /api/v1/users/:id` enviando `tenantId`).
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
* **Gestión de Proveedores:**
  * Crear, modificar, consultar y eliminar proveedores (`/api/v1/suppliers`).
  * Búsqueda y filtrado por nombre con mínimo 3 letras (`GET /api/v1/suppliers?search=xxx`).
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
  * Listar y consultar proveedores (`GET /api/v1/suppliers`), incluyendo búsqueda por nombre (mínimo 3 letras).
  * Consultar el directorio de usuarios (`GET /api/v1/users` y `GET /api/v1/users/:id`) para fines de nómina y conciliación.
* **Restricción:** NO puede crear, editar ni eliminar proveedores, empresas ni usuarios.

---

### 📦 `WAREHOUSE_MANAGER` (Jefe de Almacén / Bodega)
Rol operativo responsable del control de existencias físicas y bodega dentro de la empresa.
* **Ámbito:** Confinado a la empresa (Tenant único).
* **En el Core Actual:**
  * Iniciar y cerrar sesión (`/api/v1/auth/login`, `/logout`).
  * Consultar su propio perfil (`GET /api/v1/auth/me`).
  * Consultar información general de la empresa (`GET /api/v1/tenants/current`).
* **Restricción de Seguridad:** **NO tiene acceso al listado general de usuarios** (`GET /api/v1/users` retorna `403 Forbidden`) para proteger los datos personales de la nómina.

---

### 💳 `CASHIER` (Cajero / Punto de Venta)
Rol operativo de atención directa y cobro en mostrador dentro de la empresa.
* **Ámbito:** Confinado a la empresa (Tenant único).
* **En el Core Actual:**
  * Iniciar y cerrar sesión (`/api/v1/auth/login`, `/logout`).
  * Consultar su propio perfil (`GET /api/v1/auth/me`), obteniendo su nombre, rol y nombre de la empresa.
  * Consultar la información básica del tenant (`GET /api/v1/tenants/current`).
* **Restricción de Seguridad:** **NO tiene acceso al listado general de usuarios** (`GET /api/v1/users` retorna `403 Forbidden`). Solo ve sus propios datos en `/auth/me`.

---

## 3. Matriz de Permisos por Endpoint

| Módulo | Método | Ruta | OWNER | ADMIN | ACCOUNTANT | WAREHOUSE_MANAGER | CASHIER |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **Auth** | `POST` | `/api/v1/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `POST` | `/api/v1/auth/refresh` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | ✅ *(público)* | ✅ *(público)* | ✅ *(público)* | ✅ *(público)* | ✅ *(público)* |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | ✅ *(público)* | ✅ *(público)* | ✅ *(público)* | ✅ *(público)* | ✅ *(público)* |
| **Auth** | `POST` | `/api/v1/auth/logout` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `GET` | `/api/v1/auth/me` | ✅ *(con IDs)* | ✅ *(con IDs)* | ✅ *(básico)* | ✅ *(básico)* | ✅ *(básico)* |
| **Tenants** | `GET` | `/api/v1/tenants` | ✅ *(listar todas)* | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `GET` | `/api/v1/tenants/:id` | ✅ *(por ID)* | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `GET` | `/api/v1/tenants/current` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tenants** | `POST` | `/api/v1/tenants` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `PATCH` | `/api/v1/tenants/current` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Tenants** | `DELETE`| `/api/v1/tenants/current` | ✅ | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 |
| **Suppliers**| `GET` | `/api/v1/suppliers` | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| **Suppliers**| `GET` | `/api/v1/suppliers/:id` | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| **Suppliers**| `POST` | `/api/v1/suppliers` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Suppliers**| `PATCH`| `/api/v1/suppliers/:id` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| **Suppliers**| `DELETE`| `/api/v1/suppliers/:id` | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
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

### ✅ Problema 4: Supresión Total de Sucursales (Empresa Única por Cliente) — [RESUELTO]
* **Diagnóstico anterior:** Existía el concepto de sucursales (`branches`), agregando complejidad innecesaria y acoplamiento donde los usuarios requerían sedes físicas.
* **Solución aplicada:**
  * Se eliminó por completo el módulo de sucursales (`BranchModule`), su tabla, sus casos de uso, DTOs y controladores.
  * Cada cliente opera exclusivamente con una única empresa (`Tenant`).
  * Los roles operativos (`CASHIER`, `WAREHOUSE_MANAGER`, `ACCOUNTANT`, `ADMIN`, `OWNER`) pertenecen directamente a su empresa sin vinculación a sedes secundarias.

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

### ✅ Problema 7: Asignación y Reasignación de Empresa a Usuarios por el OWNER — [RESUELTO]
* **Diagnóstico anterior:** Cuando un `OWNER` creaba una nueva empresa (`POST /api/v1/tenants`), no podía asignar usuarios a esa nueva empresa ni transferir un usuario existente (por ejemplo, a sí mismo o a otro Owner), porque:
  1. `POST /api/v1/users` obligaba a que el usuario se creara en `req.user.tenantId`.
  2. `PATCH /api/v1/users/:id` rechazaba el atributo `tenantId` (`forbidNonWhitelisted`).
* **Solución aplicada:**
  * **Al crear (`POST /api/v1/users`):**
    * Se habilitó el campo opcional `tenantId?: string` en `CreateUserDto`.
    * Exclusivo para el rol `OWNER`: Si el `OWNER` envía `tenantId`, el usuario se crea directamente en esa empresa destino (validando previamente que el tenant exista).
    * Si otro rol intenta enviar `tenantId` distinto al de su sesión, recibe `403 Forbidden` (`InsufficientPermissionsException`).
  * **Al actualizar / transferir (`PATCH /api/v1/users/:id`):**
    * Se habilitó el campo opcional `tenantId?: string` en `UpdateUserProfileDto`.
    * Si el `OWNER` envía `tenantId`, el sistema:
      1. Valida que el tenant de destino exista en el sistema.
      2. Invalida todas las sesiones activas del usuario en Redis para revocar tokens con el `tenantId` anterior.
      3. Actualiza `tenant_id` en la tabla `users` mediante `PostgresUserRepository.updateProfile`.
    * Si otro rol intenta modificar el `tenantId`, recibe `403 Forbidden`.

---

### ✅ Problema 8: Recuperación de Contraseña Self-Service (Olvido de Contraseña) — [RESUELTO]
* **Diagnóstico anterior:** El sistema solo contaba con reseteo administrativo mediante `POST /api/v1/users/:id/reset-password` (restringido a `OWNER` y `ADMIN`). No existía un flujo de autoservicio para que cualquier usuario pudiera restablecer su contraseña si la olvidaba.
* **Solución aplicada:**
  * **Solicitud de reseteo (`POST /api/v1/auth/forgot-password`):**
    * Endpoint público protegido con `RateLimitGuard` (máximo 3 peticiones por minuto por correo para evitar abusos y spam).
    * **Anti-enumeración:** Si el usuario no existe o está inactivo, retorna el mismo mensaje genérico exitoso HTTP 200 para evitar fugas de información sobre correos registrados.
    * Si el usuario existe y está activo:
      * Genera un token aleatorio criptográfico único con expiración automática de 15 minutos (900s) almacenado en Redis (`pwd_reset:<token>`).
      * Notifica al usuario vía `EmailServicePort` (implementado por `ConsoleEmailAdapter` en consola/logs para pruebas locales y simulador de correo).
  * **Restablecimiento con token (`POST /api/v1/auth/reset-password`):**
    * Endpoint público protegido con `RateLimitGuard` (máximo 5 peticiones por minuto).
    * Valida y consume el token atómicamente desde Redis (elimina la clave para prevenir ataques de repetición / replay attacks).
    * Hashea la nueva contraseña con `bcrypt` (10 salt rounds) y actualiza la tabla `users` en PostgreSQL mediante `PostgresUserRepository.resetPassword` con bypass controlado de RLS para soportar la ejecución no autenticada.
    * Invalida todas las sesiones JWT y refresh tokens activos del usuario en Redis (`sessionCache.invalidateUserSessions`), garantizando que cualquier sesión previa quede revocada de inmediato.

---

### 📌 Notas de Arquitectura a Futuro:

1. **Multi-Empresa por Usuario (N:M):**
   * Actualmente cada registro de usuario pertenece a un solo `tenant_id` (modelo 1:N).
   * Para permitir que un mismo usuario administre varias empresas sin credenciales duplicadas, se requerirá en el futuro desacoplar la identidad global (`accounts`) de la membresía (`tenant_memberships`).
