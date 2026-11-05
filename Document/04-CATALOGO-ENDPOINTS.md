# 📡 Catálogo de Endpoints (API REST)

> Referencia completa de todos los endpoints de la API con sus métodos, rutas, parámetros, roles requeridos y ejemplos de request/response.

---

## Base URL

```
http://localhost:3000
```

## Swagger UI

```
http://localhost:3000/api/docs
```

---

## 🔑 Auth — Autenticación y Sesiones

### `POST /api/v1/auth/login`

Inicia sesión con credenciales del usuario. Retorna tokens JWT.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | No requerida (endpoint público) |
| **Rate Limit** | 5 intentos por minuto por email |
| **Roles** | Cualquiera |

**Request Body:**
```json
{
  "email": "owner@techsolutions.com",
  "password": "Password123*"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4-e5f6-...",
  "expiresIn": "1h"
}
```

---

### `POST /api/v1/auth/refresh`

Rota el refresh token y genera nuevos tokens JWT.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | No requerida |
| **Roles** | Cualquiera |

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4-e5f6-..."
}
```

---

### `POST /api/v1/auth/logout`

Cierra la sesión actual invalidando el token en Redis.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | Todos |

**Response (200 OK):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

### `GET /api/v1/auth/me`

Retorna el perfil del usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | Todos |

**Response (200 OK):**
```json
{
  "id": "d1000000-0000-4000-8000-000000000001",
  "fullName": "Carlos Dueño Tech",
  "email": "owner@techsolutions.com",
  "role": "OWNER",
  "tenantName": "Tech Solutions SAS",
  "branchName": null
}
```

---

### `POST /api/v1/auth/forgot-password`

Solicita un token de recuperación de contraseña. Siempre retorna 200 (anti-enumeración).

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | No requerida (endpoint público) |
| **Rate Limit** | 3 intentos por minuto por email |

**Request Body:**
```json
{
  "email": "owner@techsolutions.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Si el correo está registrado, recibirás un enlace de recuperación."
}
```

---

### `POST /api/v1/auth/reset-password`

Restablece la contraseña usando un token temporal de un solo uso.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | No requerida (endpoint público) |
| **Rate Limit** | 5 intentos por minuto |

**Request Body:**
```json
{
  "token": "abc123def456...",
  "newPassword": "NuevaContraseña456*"
}
```

---

## 🏢 Tenants — Gestión de Empresas

### `GET /api/v1/tenants`

Lista todas las empresas registradas en el sistema.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER |

---

### `GET /api/v1/tenants/current`

Obtiene los datos de la empresa del usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN, ACCOUNTANT, WAREHOUSE_MANAGER, CASHIER |

**Response (200 OK):**
```json
{
  "id": "a1000000-0000-4000-8000-000000000001",
  "nitRut": "900123456-1",
  "businessName": "Tech Solutions SAS",
  "tradeName": "TechStore Global",
  "address": "Calle 10 # 20-30 Bogotá",
  "phone": "+573001234567",
  "email": "contacto@techsolutions.com",
  "countryCode": "COL",
  "currencyCode": "COP",
  "isActive": true
}
```

---

### `GET /api/v1/tenants/:id`

Obtiene los datos de una empresa específica por su UUID.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER |
| **Parámetros** | `id` — UUID de la empresa |

---

### `POST /api/v1/tenants`

Crea una nueva empresa.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER |

**Request Body:**
```json
{
  "nitRut": "900555444-3",
  "businessName": "Nueva Empresa SAS",
  "tradeName": "NuevaCo",
  "address": "Calle 50 # 10-20 Cali",
  "phone": "+573205551234",
  "email": "info@nuevaco.com",
  "countryCode": "COL",
  "currencyCode": "COP",
  "taxRegime": "RESPONSABLE_IVA"
}
```

---

### `PATCH /api/v1/tenants/current`

Actualiza datos de contacto de la empresa actual.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN |

---

### `DELETE /api/v1/tenants/current`

Desactiva la empresa actual (soft delete).

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER |

---

## 🏬 Branches — Sucursales

### `GET /api/v1/branches`

Lista todas las sucursales de la empresa del usuario.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | Todos |

---

### `GET /api/v1/branches/:identifier`

Obtiene una sucursal por UUID o por nombre.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | Todos |
| **Parámetros** | `identifier` — UUID o nombre de la sucursal |

---

### `POST /api/v1/branches`

Crea una nueva sucursal.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN |

**Request Body:**
```json
{
  "name": "Sede Sur Bogotá",
  "address": "Calle 100 Sur # 5-10",
  "phone": "+573001115555"
}
```

---

### `PATCH /api/v1/branches/:identifier`

Actualiza una sucursal por UUID o nombre.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN |

---

### `DELETE /api/v1/branches/:identifier`

Desactiva una sucursal (soft delete).

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN |

---

## 👥 Users — Gestión de Usuarios

### `GET /api/v1/users`

Lista todos los usuarios de la empresa con filtros opcionales.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN, ACCOUNTANT |

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `branch_id` | string (UUID) | Filtrar por sucursal |
| `role` | string | Filtrar por rol |
| `is_active` | string ("true"/"false") | Filtrar por estado |

---

### `GET /api/v1/users/:id`

Obtiene un usuario específico por UUID.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN, ACCOUNTANT |

---

### `POST /api/v1/users`

Crea un nuevo usuario.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER (cualquier rol), ADMIN (solo operativos) |

**Request Body:**
```json
{
  "firstName": "María",
  "lastName": "García López",
  "email": "maria.garcia@techsolutions.com",
  "password": "Password123*",
  "documentType": "CC",
  "documentNumber": "1234567890",
  "phone": "+573001112233",
  "role": "ACCOUNTANT",
  "branchName": "Sede Principal Bogotá",
  "tenantId": "a1000000-0000-4000-8000-000000000001"
}
```

> **Nota:** `tenantId` es opcional y solo el OWNER puede usarlo para crear usuarios en otra empresa.
> **Nota:** `branchName` se resuelve automáticamente al UUID de la sucursal.

---

### `PATCH /api/v1/users/:id`

Actualiza el perfil de un usuario. El OWNER puede transferir usuarios entre empresas.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN (con restricciones jerárquicas) |

**Request Body (parcial):**
```json
{
  "fullName": "María García Actualizada",
  "phone": "+573001119999",
  "branchId": "b1000000-0000-4000-8000-000000000002",
  "tenantId": "a2000000-0000-4000-8000-000000000002"
}
```

> **Nota:** `tenantId` solo para OWNER — transfiere el usuario a otra empresa, invalida sesiones y desasocia sucursal.

---

### `PATCH /api/v1/users/:id/status`

Activa o desactiva un usuario.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN (salvo OWNER/ADMIN target) |

**Request Body:**
```json
{
  "isActive": false
}
```

---

### `POST /api/v1/users/:id/reset-password`

Resetea la contraseña de un usuario (reseteo administrativo).

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN (salvo OWNER/ADMIN target) |

**Request Body:**
```json
{
  "newPassword": "NuevaContraseña456*"
}
```

---

### `PATCH /api/v1/users/:id/role`

Cambia el rol de un usuario.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER (cualquier rol), ADMIN (solo operativos) |

**Request Body:**
```json
{
  "role": "WAREHOUSE_MANAGER"
}
```

---

### `DELETE /api/v1/users/:id`

Desactiva un usuario (soft delete). Retorna `204 No Content`.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN (salvo OWNER/ADMIN target) |

---

### `GET /api/v1/users/:id/audit-trail`

Consulta la bitácora de auditoría de un usuario específico.

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | Bearer Token |
| **Roles** | OWNER, ADMIN |

**Query Parameters:**
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Página actual |
| `limit` | number | 20 | Registros por página |

---

## 💚 Health Check

### `GET /health` y `GET /api/v1/health`

Verifica el estado de salud del sistema (PostgreSQL y Redis).

| Propiedad | Valor |
|-----------|-------|
| **Autenticación** | No requerida (endpoint público) |

**Response (200 OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```
