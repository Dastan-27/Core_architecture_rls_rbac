# Mock — Coleccion de Requests HTTP

Archivos listos para probar la API de **Core Architecture RLS & RBAC** sin escribir nada desde cero.

---

## Archivos disponibles

| Archivo | Uso |
|---|---|
| `openapi.json` | Especificación OpenAPI 3.0 / Swagger del Core para autogenerar clientes o validar esquemas |
| `api-core.http` | VS Code REST Client / Thunder Client |
| `postman-collection.json` | Postman / Insomnia |

> **Nota:** Puedes regenerar `openapi.json` en cualquier momento ejecutando:
> ```bash
> npm run export:openapi
> ```

---

## Requisitos previos

1. El proyecto debe estar corriendo localmente:
   ```bash
   # Levantar la base de datos y Redis
   docker compose up -d

   # Instalar dependencias (primera vez)
   npm install

   # Ejecutar el seed de datos
   npm run seed

   # Iniciar el servidor
   npm run start:dev
   ```

2. El servidor queda disponible en: `http://localhost:3001`
3. Swagger disponible en: `http://localhost:3001/api/docs`

---

## Opcion A — VS Code REST Client (recomendado)

1. Instala la extension **REST Client** (ID: `humao.rest-client`) en VS Code
2. Abre el archivo `api-core.http`
3. Aparece el boton **"Send Request"** encima de cada bloque HTTP
4. Haz login primero y copia el `access_token` en la variable `@ACCESS_TOKEN`

---

## Opcion B — Thunder Client

1. Instala la extension **Thunder Client** en VS Code
2. Ve a Thunder Client > Collections > Import
3. Selecciona `postman-collection.json`

---

## Opcion C — Postman

1. Abre Postman
2. Click en **Import** (esquina superior izquierda)
3. Arrastra el archivo `postman-collection.json`
4. La coleccion aparece con todas las carpetas organizadas

---

## Flujo de uso rapido

```
1. Ejecutar: POST /api/v1/auth/login
   (usa cualquier email del seed)

2. Copiar el "access_token" de la respuesta

3. Pegarlo en la variable ACCESS_TOKEN de la coleccion

4. Ejecutar cualquier otro endpoint
```

---

## Documentación detallada de Roles y Permisos

Para consultar la matriz completa de endpoints por rol, las responsabilidades de cada rol y el análisis de problemas de seguridad y RBAC, consulta [ROLES.md](../ROLES.md).

---

## Credenciales del Seed

**Contrasena universal:** `Password123*`

### Tenant 1 — Tech Solutions SAS

| Rol | Email |
|---|---|
| OWNER | owner@techsolutions.com |
| ADMIN | admin@techsolutions.com |
| ACCOUNTANT | accountant@techsolutions.com |
| WAREHOUSE_MANAGER | warehouse@techsolutions.com |
| CASHIER | cashier@techsolutions.com |

### Tenant 2 — Comercializadora Andina SAS (para pruebas RLS)

| Rol | Email |
|---|---|
| OWNER | owner@andina.com |

---

## Escenarios de prueba incluidos

### RLS — Aislamiento Multi-Tenant
- Login con `owner@andina.com` y listar `/api/v1/users`
- Debe ver **solo** los usuarios de su empresa, nunca los de Tech Solutions

### RBAC — Control de Acceso por Rol
- Login como CASHIER e intentar crear un usuario
- Debe retornar **403 Forbidden**

### Rate Limiting
- Hacer 6 intentos de login seguidos al mismo email
- El 6to intento debe retornar **429 Too Many Requests**

---

## Tabla de endpoints

| Metodo | Ruta | Roles Requeridos |
|---|---|---|
| POST | /api/v1/auth/login | (publico) |
| POST | /api/v1/auth/refresh | (publico) |
| POST | /api/v1/auth/logout | Autenticado |
| GET | /api/v1/auth/me | Autenticado |
| GET | /api/v1/tenants/current | Todos |
| POST | /api/v1/tenants | OWNER |
| PATCH | /api/v1/tenants/current | OWNER, ADMIN |
| DELETE | /api/v1/tenants/current | OWNER |
| GET | /api/v1/branches | Todos |
| GET | /api/v1/branches/:id | Todos |
| POST | /api/v1/branches | OWNER, ADMIN |
| PATCH | /api/v1/branches/:id | OWNER, ADMIN |
| DELETE | /api/v1/branches/:id | OWNER, ADMIN |
| GET | /api/v1/users | Todos |
| GET | /api/v1/users/:id | Todos |
| POST | /api/v1/users | OWNER, ADMIN |
| PATCH | /api/v1/users/:id | OWNER, ADMIN |
| PATCH | /api/v1/users/:id/status | OWNER, ADMIN |
| POST | /api/v1/users/:id/reset-password | OWNER, ADMIN |
| PATCH | /api/v1/users/:id/role | OWNER |
| GET | /api/v1/users/:id/audit-trail | OWNER, ADMIN |
| DELETE | /api/v1/users/:id | OWNER, ADMIN |

