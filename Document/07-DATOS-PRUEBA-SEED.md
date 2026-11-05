# 🧪 Datos de Prueba (Seed)

> Credenciales y datos pre-configurados que el script de siembra (`npm run seed`) inserta en la base de datos para pruebas y desarrollo.

---

## Cómo Ejecutar el Seed

```bash
npm run seed
```

> El seed es **idempotente**: puede ejecutarse múltiples veces sin duplicar datos (usa `ON CONFLICT ... DO UPDATE`).

---

## Contraseña Universal

```
Password123*
```

**Todos los usuarios creados por el seed usan esta misma contraseña.** Es la que debes usar al hacer login en Swagger o Postman.

---

## Empresas (Tenants)

| # | UUID | Razón Social | Nombre Comercial | NIT | Ubicación |
|---|------|-------------|-------------------|-----|-----------|
| 1 | `a1000000-0000-4000-8000-000000000001` | Tech Solutions SAS | TechStore Global | 900123456-1 | Bogotá |
| 2 | `a2000000-0000-4000-8000-000000000002` | Comercializadora Andina SAS | Andina Express | 900987654-2 | Medellín |

---

## Sucursales (Branches)

| # | UUID | Código | Nombre | Empresa | Dirección |
|---|------|--------|--------|---------|-----------|
| 1 | `b1000000-0000-4000-8000-000000000001` | SUC-001 | Sede Principal Bogotá | Tech Solutions | Calle 10 # 20-30 Piso 2 |
| 2 | `b1000000-0000-4000-8000-000000000002` | SUC-002 | Sede Norte Bogotá | Tech Solutions | Autopista Norte # 128-45 |
| 3 | `b2000000-0000-4000-8000-000000000001` | SUC-101 | Sede Central Medellín | Andina | Carrera 43A # 1-50 Local 102 |

---

## Usuarios

### Tenant 1: Tech Solutions SAS

| Rol | Email | Nombre | Documento | Sucursal |
|-----|-------|--------|-----------|----------|
| 👑 **OWNER** | `owner@techsolutions.com` | Carlos Dueño Tech | CC 1010101001 | *(null — transversal)* |
| 🛡️ **ADMIN** | `admin@techsolutions.com` | Andrea Administradora | CC 1010101002 | Sede Principal Bogotá |
| 📊 **ACCOUNTANT** | `accountant@techsolutions.com` | Camilo Contador | CC 1010101003 | Sede Principal Bogotá |
| 📦 **WAREHOUSE_MANAGER** | `warehouse@techsolutions.com` | William Bodeguero | CC 1010101004 | Sede Norte Bogotá |
| 💳 **CASHIER** | `cashier@techsolutions.com` | Carolina Cajera | CC 1010101005 | Sede Principal Bogotá |

### Tenant 2: Comercializadora Andina SAS

| Rol | Email | Nombre | Documento | Sucursal |
|-----|-------|--------|-----------|----------|
| 👑 **OWNER** | `owner@andina.com` | Mateo Dueño Andina | CC 2020202001 | *(null — transversal)* |

> **¿Para qué sirve el Tenant 2?** Para validar el aislamiento RLS. Si inicias sesión con `owner@andina.com`, no deberías ver ningún dato de Tech Solutions.

---

## Cómo Probar en Swagger

### 1. Abre Swagger

```
http://localhost:3000/api/docs
```

### 2. Login con cualquier usuario

Usa el endpoint `POST /api/v1/auth/login`:

```json
{
  "email": "owner@techsolutions.com",
  "password": "Password123*"
}
```

### 3. Copia el `accessToken`

De la respuesta del login, copia el campo `accessToken`.

### 4. Autoriza en Swagger

1. Haz clic en el botón **🔒 Authorize** (parte superior de Swagger).
2. Pega el token en el campo.
3. Haz clic en **Authorize**.

Ahora puedes probar todos los endpoints protegidos.

---

## Flujos de Prueba Recomendados

### Prueba 1: Verificar RBAC (Control de Acceso)

1. Login como **CASHIER** (`cashier@techsolutions.com`)
2. Intenta `GET /api/v1/users` → Debe retornar **403 Forbidden**
3. Intenta `GET /api/v1/auth/me` → Debe retornar tu perfil ✅
4. Intenta `GET /api/v1/tenants/current` → Debe retornar los datos de la empresa ✅

### Prueba 2: Verificar RLS (Aislamiento Multi-Tenant)

1. Login como **OWNER de Tech Solutions** (`owner@techsolutions.com`)
2. `GET /api/v1/users` → Debe listar 5 usuarios de Tech Solutions
3. Login como **OWNER de Andina** (`owner@andina.com`)
4. `GET /api/v1/users` → Debe listar solo 1 usuario (él mismo)
5. Los datos de Tech Solutions **nunca** aparecen estando autenticado con Andina

### Prueba 3: Verificar Blindaje de ADMIN

1. Login como **ADMIN** (`admin@techsolutions.com`)
2. Intenta crear un usuario con `"role": "OWNER"` → Debe retornar **403** (escalación bloqueada)
3. Intenta crear un usuario con `"role": "CASHIER"` → Debe funcionar ✅

### Prueba 4: Verificar Transferencia de Empresa (OWNER)

1. Login como **OWNER** (`owner@techsolutions.com`)
2. `PATCH /api/v1/users/<uuid-de-cashier>` con `{ "tenantId": "a2000000-0000-4000-8000-000000000002" }`
3. El cajero debería transferirse a Comercializadora Andina

### Prueba 5: Verificar Recuperación de Contraseña

1. `POST /api/v1/auth/forgot-password` con `{ "email": "owner@techsolutions.com" }`
2. Buscar el token en los logs de la terminal (simula email por consola)
3. `POST /api/v1/auth/reset-password` con `{ "token": "<token>", "newPassword": "NuevaClave456*" }`
4. Verificar que el login antiguo falla y el nuevo funciona

---

## UUID Reference Card

Para copiar rápidamente al probar:

```
# Tenants
Tech Solutions:  a1000000-0000-4000-8000-000000000001
Andina:          a2000000-0000-4000-8000-000000000002

# Branches
Sede Bogotá:     b1000000-0000-4000-8000-000000000001
Sede Norte:      b1000000-0000-4000-8000-000000000002
Sede Medellín:   b2000000-0000-4000-8000-000000000001

# Users (Tech Solutions)
Owner:           d1000000-0000-4000-8000-000000000001
Admin:           d1000000-0000-4000-8000-000000000002
Accountant:      d1000000-0000-4000-8000-000000000003
Warehouse:       d1000000-0000-4000-8000-000000000004
Cashier:         d1000000-0000-4000-8000-000000000005

# Users (Andina)
Owner:           d2000000-0000-4000-8000-000000000001
```
