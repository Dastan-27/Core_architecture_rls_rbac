# 🏗️ Arquitectura General

> Este documento describe las decisiones de arquitectura, patrones de diseño y tecnologías del sistema **Core Architecture RLS & RBAC**.

---

## 1. Visión General

El sistema es una **API REST** construida con **NestJS 12** que sirve como backend para un SaaS contable multi-empresa. Su responsabilidad es gestionar:

- **Empresas (Tenants):** Creación, consulta y desactivación de empresas.
- **Sucursales (Branches):** CRUD de sedes/sucursales por empresa.
- **Usuarios:** CRUD con jerarquía de roles y validaciones de seguridad.
- **Autenticación:** Login con JWT, refresh tokens, logout con invalidación en Redis.
- **Autorización:** Control de acceso por rol (RBAC) con guards de NestJS.
- **Auditoría:** Registro automático de acciones críticas por usuario.
- **Aislamiento de datos:** Row-Level Security (RLS) de PostgreSQL.

```
┌─────────────────────────────────────────────────────────────────┐
│                       Clientes (Frontend / Postman)             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / REST
┌───────────────────────────────▼─────────────────────────────────┐
│                         NestJS API (Puerto 3000)                │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth Module  │  │ User Module  │  │   Tenant Module      │  │
│  │   Branch Module│  │ RBAC Module  │  │   Audit Module       │  │
│  └───────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Shared (RLS, Config, Redis, Health, HTTP)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬────────────────────────────────────────────┬───────────┘
         │                                            │
    ┌────▼─────┐                                 ┌────▼────┐
    │PostgreSQL│  ◄── RLS policies               │  Redis  │
    │   16     │      (aislamiento por tenant)    │    7    │
    └──────────┘                                  └─────────┘
```

---

## 2. Patrón Arquitectónico: Clean Architecture (Hexagonal)

El proyecto sigue **Clean Architecture** (también conocida como **Hexagonal** o **Ports & Adapters**) con influencia de **Domain-Driven Design (DDD)**:

```
┌─────────────────────────────────────────────────────────┐
│                    INFRAESTRUCTURA                       │
│  (Controllers, Repositories, Adapters, Guards, DTOs)    │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    APLICACIÓN                      │  │
│  │  (Casos de Uso / Use Cases — orquestadores)       │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │                  DOMINIO                     │  │  │
│  │  │  (Entidades, Puertos/Interfaces, Reglas)    │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### ¿Qué significa cada capa?

| Capa | Responsabilidad | Ejemplo en el proyecto |
|------|-----------------|-----------------------|
| **Dominio** | Entidades de negocio, reglas de validación, interfaces de puertos, excepciones | `User`, `Tenant`, `Branch`, `AuditLog`, `DomainException`, `UserRepositoryPort` |
| **Aplicación** | Casos de uso que orquestan las operaciones. No conocen HTTP ni bases de datos | `LoginUseCase`, `CreateUserUseCase`, `AssignRoleUseCase` |
| **Infraestructura** | Implementaciones concretas: controladores HTTP, repositorios PostgreSQL, adaptadores Redis/JWT/Bcrypt | `AuthController`, `PostgresUserRepository`, `RedisSessionAdapter` |

### Regla de Dependencia

> Las capas internas **nunca** importan de las capas externas. El dominio no sabe que existe NestJS, PostgreSQL ni Redis.

La inversión de dependencias se logra mediante **Puertos** (interfaces en el dominio) e **Inyección de Dependencias** (tokens de NestJS):

```typescript
// Puerto (dominio) — define QUÉ se necesita
export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  compare(raw: string, hash: string): Promise<boolean>;
}

// Adaptador (infraestructura) — define CÓMO se implementa
@Injectable()
export class BcryptHasherAdapter implements PasswordHasherPort { ... }

// Binding en el módulo NestJS
{ provide: PASSWORD_HASHER_PORT, useClass: BcryptHasherAdapter }
```

---

## 3. Bounded Contexts (Contextos Acotados)

El código está organizado en 6 contextos de dominio independientes, cada uno con su propia estructura interna:

| Contexto | Responsabilidad | Carpeta |
|----------|-----------------|---------|
| **Auth** | Autenticación: login, refresh, logout, forgot/reset password | `src/contexts/auth/` |
| **User** | CRUD de usuarios, cambio de estado, reseteo de contraseña admin | `src/contexts/user/` |
| **Tenant** | CRUD de empresas (tenants), activación/desactivación | `src/contexts/tenant/` |
| **Branch** | CRUD de sucursales, asociación a tenant | `src/contexts/branch/` |
| **RBAC** | Control de acceso por roles, asignación de roles, guards | `src/contexts/rbac/` |
| **Audit** | Bitácora de auditoría, consulta de trail por usuario | `src/contexts/audit/` |

Cada contexto sigue la misma estructura interna:

```
contexto/
├── application/          ← Casos de uso y DTOs
│   ├── use-cases/
│   └── dtos/
├── domain/               ← Entidades, puertos e excepciones
│   ├── models/
│   ├── ports/
│   └── exceptions/
└── infrastructure/       ← Controladores HTTP, repositorios y adaptadores
    ├── http/
    │   ├── controllers
    │   ├── dtos/
    │   └── guards/
    ├── persistence/
    ├── adapters/
    └── *.module.ts
```

---

## 4. Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **NestJS** | 12.x | Framework HTTP, inyección de dependencias, guards, interceptores |
| **TypeScript** | 6.x | Lenguaje de programación con tipado estricto |
| **PostgreSQL** | 16 Alpine | Base de datos relacional con Row-Level Security (RLS) |
| **Redis** | 7 Alpine | Caché de sesiones JWT, rate limiting, tokens de reset |
| **TypeORM** | 1.1.x | ORM para definir entidades y conexión a PostgreSQL |
| **Passport + JWT** | Latest | Estrategia de autenticación Bearer Token |
| **bcrypt** | 6.x | Hashing seguro de contraseñas |
| **Swagger/OpenAPI** | Via @nestjs/swagger | Documentación interactiva de la API |
| **Docker Compose** | — | Orquestación de PostgreSQL y Redis en desarrollo |
| **OxLint** | 1.58+ | Linter ultra-rápido con type-aware rules |
| **Prettier** | 3.x | Formateo de código |

---

## 5. Flujo de una Petición HTTP (Request Lifecycle)

```
Petición HTTP
    │
    ▼
[ CorrelationIdMiddleware ]   ← Agrega header X-Correlation-Id a la request
    │
    ▼
[ JwtAuthGuard ]              ← Valida el Bearer Token JWT (extrae userId, tenantId, role)
    │
    ▼
[ RolesGuard ]                ← Verifica que el rol del usuario tenga permiso para el endpoint
    │
    ▼
[ RlsInterceptor ]           ← Abre transacción PostgreSQL y ejecuta SET LOCAL con las
    │                            variables app.current_tenant_id, app.current_user_id, app.current_role
    │                            para activar las políticas RLS
    ▼
[ ValidationPipe ]            ← Valida y transforma el body con class-validator/class-transformer
    │
    ▼
[ Controller ]                ← Recibe la request, extrae datos y llama al caso de uso
    │
    ▼
[ Use Case ]                  ← Ejecuta lógica de negocio usando puertos (interfaces)
    │
    ▼
[ Repository / Adapter ]      ← Accede a PostgreSQL (vía QueryRunner con RLS) o a Redis
    │
    ▼
[ RlsInterceptor ]           ← Commit de la transacción (o rollback si hubo error)
    │
    ▼
Respuesta HTTP (JSON)
```

---

## 6. Decisiones de Diseño Importantes

### 6.1 RLS con `AsyncLocalStorage`

En lugar de pasar manualmente el `tenantId` a cada query, el sistema utiliza el patrón **AsyncLocalStorage** (Node.js nativo) para propagar el `QueryRunner` transaccional de forma transparente:

1. El `RlsInterceptor` abre una transacción y ejecuta `SET LOCAL` con las variables de sesión de PostgreSQL.
2. Almacena el `QueryRunner` en `AsyncLocalStorage` a través de `RlsContext`.
3. Los repositorios base (`BasePostgresRepository`) obtienen automáticamente el `QueryRunner` del contexto actual.
4. Al finalizar, el interceptor hace commit o rollback.

**Beneficio:** Los desarrolladores no necesitan preocuparse por el aislamiento multi-tenant — RLS lo garantiza automáticamente.

### 6.2 Soft Delete Universal

Ninguna entidad se elimina físicamente. El campo `is_active` marca registros como inactivos. Esto preserva integridad referencial y trazabilidad.

### 6.3 Rate Limiting por Redis

Los endpoints sensibles (login, forgot-password, reset-password) tienen rate limiting configurable implementado con un guard personalizado que almacena contadores en Redis.

### 6.4 Sesiones JWT + Redis (Stateful JWT)

Aunque el JWT es stateless por naturaleza, el sistema almacena cada sesión en Redis para permitir:
- Invalidación instantánea de sesiones al hacer logout.
- Revocación masiva de sesiones al cambiar contraseña o transferir usuario.
- Refresh tokens con rotación.

---

## 7. Diagrama de Dependencias entre Módulos

```
                    AppModule
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
   AppConfigModule  DatabaseModule   RedisModule
        │              │                  │
        └──────┬───────┴──────────────────┘
               │
        ┌──────┼─────────────────────────────────┐
        │      │                                  │
    RlsModule  HealthModule                       │
        │                                         │
        ├── AuthModule ──────┐                    │
        │   (JWT, bcrypt,    │                    │
        │    sessions)       │                    │
        │                    │                    │
        ├── UserModule ──────┤ (comparte puertos  │
        │                    │  de Auth y RBAC)   │
        ├── TenantModule     │                    │
        │                    │                    │
        ├── BranchModule     │                    │
        │                    │                    │
        ├── RbacModule ──────┘                    │
        │                                         │
        └── AuditModule ─────────────────────────┘
```
