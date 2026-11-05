# 🤖 Guía de Contexto y Prompt para Inteligencias Artificiales (LLMs / Agentes)

> **Destinatarios:** Docentes, compañeros de otros squads y desarrolladores que utilicen ChatGPT, Claude, Cursor, Gemini, Copilot o agentes autónomos para construir módulos dependientes de este repositorio.  
> **Propósito:** Proporcionar un contexto condensado, sin ambigüedades y de alta densidad técnica que cualquier modelo de IA pueda ingerir para generar código, integraciones o clientes 100% compatibles con este Core.

---

## 📋 Cómo Usar Este Documento con tu IA

Si estás trabajando en otro módulo (Facturación, Inventario, Nómina, Contabilidad o Frontend) y necesitas que tu IA entienda la arquitectura de este backend para programar clientes, pantallas o integraciones:

1. **Copia el bloque del Prompt de Contexto** que se encuentra en la Sección 1.
2. **Pégalo en tu asistente de IA** (ChatGPT, Claude Projects, Cursor System Prompt o Copilot Workspace).
3. Tu IA sabrá exactamente cómo autenticarse, qué roles existen, cómo funciona el multi-tenancy con RLS y qué UUIDs usar para pruebas.

---

## 1. 💬 Prompt Maestro para Copiar y Pegar en tu IA

```markdown
Eres un asistente de ingeniería de software senior especializado en arquitecturas multi-tenant, NestJS y PostgreSQL.
Estás trabajando en un ecosistema SaaS contable cuyo núcleo de seguridad e identidad está provisto por el repositorio:
`squad1_core_architecture_rls_rbac`.

### 📌 Ficha Técnica del Backend Core
- **Framework:** NestJS 12 (TypeScript ESM, strict mode).
- **Base de Datos:** PostgreSQL 16 con Row-Level Security (RLS) nativo.
- **Caché / Sesiones:** Redis 7 (blacklists de JWT y control de sesión).
- **URL Base Local:** `http://localhost:3000` (o `http://localhost:3001` según .env).
- **Documentación Swagger:** `http://localhost:3000/api/docs`.
- **Colección Postman y OpenAPI:** Carpeta `mock/` (`openapi.json`, `postman-collection.json`).

### 🔐 Reglas Críticas de Seguridad
1. **Multi-Tenancy por RLS:** El aislamiento de datos se gestiona a nivel de PostgreSQL ejecutando `SET LOCAL app.current_tenant_id = :tenant_id` en cada consulta. NUNCA asumas que el aislamiento se hace con un simple `WHERE tenant_id = ...` en el frontend o aplicación.
2. **Autenticación JWT:** Toda petición protegida requiere la cabecera:
   `Authorization: Bearer <access_token>`.
3. **5 Roles Jerárquicos (RBAC):**
   - `OWNER`: Propietario del tenant (gestiona empresa, sucursales y admins).
   - `ADMIN`: Administrador operativo (gestiona usuarios y asigna roles).
   - `ACCOUNTANT`: Contador (módulo contable y libros contables).
   - `WAREHOUSE_MANAGER`: Jefe de almacén (inventario y bodegas).
   - `CASHIER`: Cajero (punto de venta y facturación rápida).
4. **Borrado Lógico (Soft Delete):** Las entidades se desactivan con `is_active = false`; no se destruyen registros.
5. **IDs Universales:** Todos los identificadores son UUID v4.

### 🧪 Datos de Prueba Rápidos (Seed)
- **Contraseña Universal:** `Password123*`
- **Tenant 1 (Tech Solutions SAS):** `a1000000-0000-4000-8000-000000000001`
  - Owner: `owner@techsolutions.com`
  - Admin: `admin@techsolutions.com`
  - Accountant: `accountant@techsolutions.com`
  - Warehouse: `warehouse@techsolutions.com`
  - Cashier: `cashier@techsolutions.com`
- **Tenant 2 (Comercializadora Andina SAS):** `a2000000-0000-4000-8000-000000000002`
  - Owner: `owner@andina.com`
  - Admin: `admin@andina.com`

Cuando generes código o integraciones, respeta estrictamente estas convenciones y asegúrate de enviar el JWT en cada llamada.
```

---

## 2. 🗺️ Mapa Rápido de Endpoints (Cheatsheet para IAs)

| Método | Endpoint | Roles Permitidos | Propósito |
|--------|----------|------------------|-----------|
| `POST` | `/api/v1/auth/login` | Público | Retorna `access_token` y datos de usuario. |
| `POST` | `/api/v1/auth/refresh` | Público | Renueva token con `refresh_token`. |
| `POST` | `/api/v1/auth/logout` | Autenticado | Invalida sesión en Redis blacklist. |
| `POST` | `/api/v1/auth/forgot-password` | Público | Solicita token de recuperación (TTL 15m). |
| `POST` | `/api/v1/auth/reset-password` | Público | Establece nueva contraseña usando token. |
| `GET`  | `/api/v1/auth/me` | Autenticado | Retorna perfil del usuario en sesión. |
| `GET`  | `/api/v1/tenants/current` | Autenticado | Información de la empresa del token. |
| `PATCH`| `/api/v1/tenants/current` | `OWNER`, `ADMIN` | Actualiza datos comerciales de la empresa. |
| `GET`  | `/api/v1/branches` | Autenticado | Lista sucursales de la empresa (RLS activo). |
| `POST` | `/api/v1/branches` | `OWNER`, `ADMIN` | Registra nueva sucursal en la empresa. |
| `GET`  | `/api/v1/users` | `OWNER`, `ADMIN` | Lista usuarios del tenant paginados. |
| `POST` | `/api/v1/users` | `OWNER`, `ADMIN` | Crea nuevo usuario con rol asignado. |
| `PATCH`| `/api/v1/users/:id` | `OWNER`, `ADMIN` | Modifica usuario o desactiva (`is_active: false`). |
| `GET`  | `/api/v1/audit` | `OWNER`, `ADMIN` | Consulta logs de auditoría del tenant. |

---

## 3. 📦 Esquema Estándar de Errores (Responses)

Toda IA debe esperar y programar el manejo de errores basándose en este formato JSON estándar de NestJS:

```json
{
  "statusCode": 401,
  "message": "Token inválido o sesión revocada",
  "error": "Unauthorized"
}
```

O en caso de validación de campos (`400 Bad Request`):

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

---

## 4. 💻 Snippets de Código Listos para Copiar

### 4.1. Cliente HTTP en TypeScript (Axios con Interceptor Automático)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar JWT automáticamente
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar tokens expirados (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirigir a login o ejecutar refresh token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### 4.2. Función de Login y Obtención de Sesión

```typescript
export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'WAREHOUSE_MANAGER' | 'CASHIER';
    tenant_id: string;
    branch_id: string | null;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  
  // Guardar token para peticiones subsiguientes
  localStorage.setItem('access_token', response.data.access_token);
  return response.data;
}
```

---

### 4.3. React Hook para Validar Permisos y Roles (RBAC)

```tsx
import { useMemo } from 'react';

export type UserRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'WAREHOUSE_MANAGER' | 'CASHIER';

interface UserSession {
  role: UserRole;
  tenant_id: string;
}

export function usePermissions(currentUser: UserSession | null) {
  return useMemo(() => {
    if (!currentUser) {
      return { canManageUsers: false, canEditAccounting: false, canManageStock: false, isOwner: false };
    }

    const { role } = currentUser;

    return {
      isOwner: role === 'OWNER',
      isAdmin: role === 'OWNER' || role === 'ADMIN',
      canManageUsers: role === 'OWNER' || role === 'ADMIN',
      canEditAccounting: role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT',
      canManageStock: role === 'OWNER' || role === 'ADMIN' || role === 'WAREHOUSE_MANAGER',
      canOperateCashier: role === 'OWNER' || role === 'ADMIN' || role === 'CASHIER',
    };
  }, [currentUser]);
}
```

---

## 5. ⚠️ Errores Típicos que las IAs Deben Evitar

| Error Típico de la IA | Por qué Falla | Cómo Debe Hacerlo Correctamente |
|-----------------------|---------------|---------------------------------|
| Agregar `WHERE tenant_id = ...` en el frontend creyendo que aisla datos. | El frontend nunca debe ser responsable del aislamiento; el aislamiento lo garantiza PostgreSQL con RLS. | Pasar siempre el token JWT; el backend inyecta el `tenant_id` automáticamente en la conexión PostgreSQL. |
| Intentar usar contraseñas simples sin caracteres especiales. | El validador exige mínimo 8 caracteres, mayúscula, minúscula, número y símbolo. | Usar `Password123*` en pruebas locales y tests. |
| Enviar llamadas a endpoints protegidos sin el prefijo `Bearer `. | El `passport-jwt` rechazará la petición con `401 Unauthorized`. | Formato estricto: `Authorization: Bearer <token>`. |
| Tratar de eliminar registros con `DELETE /api/v1/users/:id`. | El sistema usa borrado lógico (`soft delete`). | Enviar `PATCH /api/v1/users/:id` con `{ "is_active": false }`. |
| Resetear contraseñas mediante petición `GET` o sin token hasheado. | El flujo de recuperación es criptográfico y requiere `POST /api/v1/auth/reset-password` con `{ token, new_password }`. | Seguir el protocolo documentado en `password-recovery/README.md`. |
