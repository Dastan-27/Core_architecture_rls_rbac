# 🚀 Guía de Instalación y Ejecución

> Paso a paso para clonar, configurar, instalar dependencias, levantar servicios y ejecutar la API por primera vez.

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

| Herramienta | Versión mínima | Propósito | Descarga |
|-------------|:---------:|-----------|----------|
| **Node.js** | 22.x | Runtime de JavaScript/TypeScript | [nodejs.org](https://nodejs.org/) |
| **npm** | 10.x | Gestor de paquetes (viene con Node) | — |
| **Docker Desktop** | 4.x | Ejecutar PostgreSQL y Redis en contenedores | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | 2.x | Control de versiones | [git-scm.com](https://git-scm.com/) |

**Opcional pero recomendado:**
- **Postman** o **Insomnia** — para probar los endpoints de la API.
- **DBeaver** o **pgAdmin** — para inspeccionar la base de datos PostgreSQL.

---

## Paso 1: Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO> squad1_core_architecture_rls_rbac
cd squad1_core_architecture_rls_rbac
```

---

## Paso 2: Instalar Dependencias

```bash
npm install
```

Esto descargará todas las dependencias listadas en `package.json` (~194 KB de lock file).

---

## Paso 3: Configurar Variables de Entorno

Copia el archivo de ejemplo y ajusta los valores según tu entorno:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

El archivo `.env` resultante contiene:

```env
# ─── Entorno ──────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ─── Base de datos ─────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=core_rls_rbac

# ─── SSL (desactivado para desarrollo local) ──────────────
DB_SSL=false

# ─── Desarrollo ──────────────────────────────────────────
DB_SYNCHRONIZE=true            # ⚠ Solo para desarrollo, nunca en producción

# ─── JWT ─────────────────────────────────────────────────
JWT_SECRET=super-secret-jwt-key-change-me
JWT_EXPIRES_IN=1h

# ─── Redis ───────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── CORS ────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

> ⚠️ **Importante:** `DB_SYNCHRONIZE=true` crea automáticamente las tablas de la base de datos al iniciar la aplicación. **Nunca usar en producción.**

---

## Paso 4: Levantar PostgreSQL y Redis con Docker

```bash
docker compose up -d
```

Esto levantará dos contenedores:
- **PostgreSQL 16 Alpine** en el puerto `5432`
- **Redis 7 Alpine** en el puerto `6379`

Para verificar que ambos contenedores están corriendo:

```bash
docker compose ps
```

Deberías ver algo como:

```
NAME                         STATUS
core_rls_rbac_postgres       running (healthy)
core_rls_rbac_redis          running (healthy)
```

---

## Paso 5: Iniciar la Aplicación (Primera Vez)

```bash
npm run start:dev
```

Al iniciar por primera vez con `DB_SYNCHRONIZE=true`, NestJS/TypeORM:
1. Se conecta a PostgreSQL.
2. Crea automáticamente todas las tablas (`tenants`, `branches`, `users`, `audit_logs`).
3. Verifica la conexión a Redis.
4. Inicia el servidor en el puerto configurado.

**Output esperado:**

```
[Bootstrap] Servidor iniciado en el puerto 3000
[Bootstrap] Swagger disponible en http://localhost:3000/api/docs
[DatabaseService] Conexión a la base de datos establecida correctamente
[RedisService] Redis: conexión TCP establecida
[RedisService] Redis: cliente listo para recibir comandos
```

---

## Paso 6: Ejecutar el Seed (Datos de Prueba)

Con la aplicación detenida o en otra terminal:

```bash
npm run seed
```

El seed script crea:
- **2 empresas** (Tech Solutions SAS y Comercializadora Andina SAS)
- **3 sucursales** (2 para Tech Solutions, 1 para Andina)
- **6 usuarios** con cada rol RBAC (OWNER, ADMIN, ACCOUNTANT, WAREHOUSE_MANAGER, CASHIER)
- **2 registros de auditoría** iniciales

**Todos los usuarios tienen la misma contraseña:** `Password123*`

Para más detalles sobre los datos del seed, consulta [07-DATOS-PRUEBA-SEED.md](./07-DATOS-PRUEBA-SEED.md).

---

## Paso 7: Verificar que Todo Funciona

### 7.1 Abrir Swagger

Navega a: **http://localhost:3000/api/docs**

Aquí puedes ver y probar todos los endpoints de la API de forma interactiva.

### 7.2 Probar Login

Con Swagger o con curl:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@techsolutions.com", "password": "Password123*"}'
```

Respuesta esperada:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "...",
  "expiresIn": "1h"
}
```

### 7.3 Importar Colección Postman

Importa el archivo `mock/postman-collection.json` en Postman para tener todos los endpoints pre-configurados.

---

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Inicia en modo desarrollo con hot-reload (watch mode) |
| `npm run start` | Inicia sin hot-reload |
| `npm run start:prod` | Inicia en modo producción (requiere `npm run build` previo) |
| `npm run build` | Compila TypeScript a JavaScript en la carpeta `dist/` |
| `npm run seed` | Ejecuta el script de siembra de datos de prueba |
| `npm run lint` | Ejecuta OxLint con type-aware rules |
| `npm run format` | Formatea el código con Prettier |
| `npm run export:openapi` | Genera el archivo `mock/openapi.json` desde Swagger |
| `npm run test:recovery` | Ejecuta el script de pruebas de recuperación de contraseña |

---

## Solución de Problemas Comunes

### Error: "connect ECONNREFUSED 127.0.0.1:5432"
**Causa:** PostgreSQL no está corriendo.
**Solución:** Ejecuta `docker compose up -d` y espera a que el health check pase.

### Error: "connect ECONNREFUSED 127.0.0.1:6379"
**Causa:** Redis no está corriendo.
**Solución:** Ejecuta `docker compose up -d`.

### Error: "relation 'tenants' does not exist"
**Causa:** Las tablas no se han creado aún.
**Solución:** Asegúrate de que `DB_SYNCHRONIZE=true` en `.env` y reinicia la aplicación.

### Error: "duplicate key value violates unique constraint"
**Causa:** El seed ya se ejecutó previamente.
**Solución:** El seed usa `ON CONFLICT ... DO UPDATE`, así que es idempotente. Puedes ejecutarlo múltiples veces sin problema.

### Error: "Cannot find module"
**Causa:** Faltan dependencias.
**Solución:** Ejecuta `npm install` y luego intenta de nuevo.

---

## Apagar Todo

```bash
# Detener la aplicación NestJS
Ctrl+C

# Detener y remover contenedores Docker
docker compose down

# Si quieres también eliminar los volúmenes de datos persistidos
docker compose down -v
```
