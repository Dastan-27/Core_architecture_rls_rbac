# 📂 Estructura del Proyecto

> Árbol de carpetas completo y comentado del repositorio `squad1_core_architecture_rls_rbac`.

---

## Raíz del Proyecto

```
squad1_core_architecture_rls_rbac/
│
├── .env                          # Variables de entorno (NO se sube a Git)
├── .env.example                  # Plantilla de variables de entorno
├── .gitignore                    # Archivos excluidos de Git
├── .oxlintrc.json                # Configuración del linter OxLint
├── .prettierrc                   # Configuración de Prettier (formateo de código)
├── docker-compose.yml            # Orquestación de PostgreSQL 16 y Redis 7
├── nest-cli.json                 # Configuración del CLI de NestJS
├── package.json                  # Dependencias, scripts y metadata del proyecto
├── tsconfig.json                 # Configuración global de TypeScript
├── tsconfig.build.json           # Configuración de TypeScript para compilación (build)
├── README.md                     # README original de NestJS (boilerplate)
├── ROLES.md                      # Manual completo de roles, permisos y blindaje de seguridad
│
├── Document/                     # 📚 Documentación técnica del proyecto (ESTÁS AQUÍ)
│   ├── README.md                 # Índice central de documentación
│   ├── 01-ARQUITECTURA.md        # Arquitectura general y patrones
│   ├── 02-ESTRUCTURA-PROYECTO.md # Este archivo — árbol de carpetas
│   ├── 03-SEGURIDAD-RLS-RBAC.md  # Seguridad: RLS y control de acceso
│   ├── 04-CATALOGO-ENDPOINTS.md  # Catálogo de endpoints de la API
│   ├── 05-MODELO-DATOS.md        # Modelo de datos y entidades
│   ├── 06-GUIA-INSTALACION.md    # Guía paso a paso para correr el proyecto
│   ├── 07-DATOS-PRUEBA-SEED.md   # Datos de prueba y credenciales del seed
│   └── password-recovery/        # Documentación del flujo de recuperación de contraseña
│       └── README.md
│
├── mock/                         # Archivos de integración para otros equipos
│   ├── Importante.txt            # Nota importante sobre los archivos mock
│   ├── README.md                 # Guía de uso de los archivos mock
│   ├── openapi.json              # Especificación OpenAPI/Swagger exportada
│   └── postman-collection.json   # Colección Postman lista para importar
│
├── scripts/                      # Scripts de utilidad
│   ├── export-openapi.ts         # Genera el archivo openapi.json desde Swagger
│   └── test-password-recovery-flow.ts  # Script de pruebas del flujo de recuperación
│
├── src/                          # 🎯 CÓDIGO FUENTE PRINCIPAL
│   ├── main.ts                   # Punto de entrada de la aplicación
│   ├── app.module.ts             # Módulo raíz de NestJS
│   ├── contexts/                 # Bounded Contexts (módulos de dominio)
│   └── shared/                   # Código compartido entre contextos
│
└── dist/                         # Código compilado (generado por `npm run build`)
```

---

## Código Fuente (`src/`)

### `src/main.ts` — Punto de Entrada

Configura y arranca la aplicación NestJS:
- Registra el `DomainExceptionFilter` global (manejo de errores de dominio).
- Configura `ValidationPipe` con whitelist y transformación.
- Habilita CORS configurable por variable de entorno.
- Monta Swagger UI en `/api/docs`.
- Escucha en el puerto configurado (default: 3000).

### `src/app.module.ts` — Módulo Raíz

Importa y orquesta todos los módulos del sistema:

```
AppModule
├── AppConfigModule          # Configuración centralizada (.env)
├── DatabaseModule           # Conexión a PostgreSQL con TypeORM
├── RedisModule              # Conexión a Redis (ioredis)
├── RlsModule                # Interceptor global de Row-Level Security
├── HealthModule             # Endpoint de health check (/health)
├── AuthModule               # Autenticación (login, refresh, logout, password recovery)
├── RbacModule               # Control de acceso por roles
├── TenantModule             # Gestión de empresas
├── BranchModule             # Gestión de sucursales
├── UserModule               # Gestión de usuarios
└── AuditModule              # Bitácora de auditoría
```

---

## Contextos de Dominio (`src/contexts/`)

### 📦 Auth (`src/contexts/auth/`)

```
auth/
├── application/
│   ├── dtos/
│   │   └── auth.dtos.ts                    # DTOs: LoginDto, RefreshDto, ForgotPasswordDto, ResetPasswordWithTokenDto
│   └── use-cases/
│       ├── login.use-case.ts               # Valida credenciales, genera JWT + refresh token
│       ├── refresh-token.use-case.ts       # Rota refresh token, genera nuevos tokens
│       ├── get-profile.use-case.ts         # Devuelve perfil del usuario autenticado
│       ├── logout.use-case.ts              # Invalida sesión en Redis
│       ├── forgot-password.use-case.ts     # Genera token temporal y "envía" correo
│       └── reset-password-with-token.use-case.ts  # Valida token, actualiza contraseña
├── domain/
│   ├── exceptions/
│   │   └── auth.exceptions.ts              # InvalidCredentials, UserInactive, etc.
│   ├── models/
│   │   └── auth-result.ts                  # Tipo de retorno del login (tokens)
│   └── ports/
│       ├── email-service.port.ts           # Puerto: envío de correos
│       ├── password-hasher.port.ts         # Puerto: hashing de contraseñas
│       ├── password-reset-token.port.ts    # Puerto: tokens de reset en Redis
│       ├── session-cache.port.ts           # Puerto: sesiones JWT en Redis
│       └── token-service.port.ts           # Puerto: generación/validación de JWT
└── infrastructure/
    ├── auth.module.ts                      # Módulo NestJS con bindings Port→Adapter
    ├── adapters/
    │   ├── bcrypt-hasher.adapter.ts        # Implementa PasswordHasherPort con bcrypt
    │   ├── console-email.adapter.ts        # Implementa EmailServicePort (imprime en consola)
    │   ├── jwt-token.adapter.ts            # Implementa TokenServicePort con @nestjs/jwt
    │   ├── redis-password-reset-token.adapter.ts  # Implementa PasswordResetTokenPort en Redis
    │   └── redis-session.adapter.ts        # Implementa SessionCachePort en Redis
    └── http/
        ├── auth.controller.ts              # Endpoints: /api/v1/auth/*
        └── guards/
            └── jwt-auth.guard.ts           # Guard de autenticación JWT (Passport)
```

### 📦 User (`src/contexts/user/`)

```
user/
├── application/
│   └── use-cases/
│       └── user.use-cases.ts               # CreateUser, ListUsers, GetUser, UpdateProfile,
│                                           # UpdateStatus, ResetPassword, DeleteUser
├── domain/
│   ├── exceptions/
│   │   └── user.exceptions.ts              # UserNotFound, DuplicateEmail, BranchRequired, etc.
│   ├── models/
│   │   └── user.entity.ts                  # Entidad User con comportamientos de dominio
│   └── ports/
│       ├── user-repository.port.ts         # Puerto: operaciones de persistencia de usuarios
│       └── user-session-invalidator.port.ts  # Puerto: invalidación de sesiones del usuario
└── infrastructure/
    ├── user.module.ts                      # Módulo NestJS
    ├── http/
    │   ├── users.controller.ts             # Endpoints: /api/v1/users/*
    │   └── dtos/
    │       └── user.dtos.ts                # DTOs: CreateUserDto, UpdateUserProfileDto, etc.
    └── persistence/
        └── postgres-user.repository.ts     # Repositorio PostgreSQL para usuarios
```

### 📦 Tenant (`src/contexts/tenant/`)

```
tenant/
├── application/
│   └── use-cases/
│       └── tenant.use-cases.ts             # ListTenants, GetTenant, CreateTenant,
│                                           # UpdateTenant, DeactivateTenant
├── domain/
│   ├── exceptions/
│   │   └── tenant.exceptions.ts            # TenantNotFound, DuplicateNit, etc.
│   ├── models/
│   │   └── tenant.entity.ts                # Entidad Tenant con updateContactInfo, deactivate
│   └── ports/
│       ├── tenant-cache.port.ts            # Puerto: caché de tenant en Redis
│       ├── tenant-repository.port.ts       # Puerto: persistencia de tenants
│       └── tenant-session-invalidator.port.ts  # Puerto: invalidación de sesiones del tenant
└── infrastructure/
    ├── tenant.module.ts                    # Módulo NestJS
    ├── adapters/
    │   ├── redis-tenant-cache.adapter.ts   # Caché de datos de tenant en Redis
    │   └── redis-tenant-session.adapter.ts # Invalidación de sesiones del tenant
    ├── http/
    │   ├── tenants.controller.ts           # Endpoints: /api/v1/tenants/*
    │   └── dtos/
    │       └── tenant.dtos.ts              # DTOs: CreateTenantDto, UpdateTenantDto
    └── persistence/
        └── postgres-tenant.repository.ts   # Repositorio PostgreSQL para tenants
```

### 📦 Branch (`src/contexts/branch/`)

```
branch/
├── application/
│   └── use-cases/
│       └── branch.use-cases.ts             # ListBranches, GetBranch, CreateBranch,
│                                           # UpdateBranch, DeleteBranch
├── domain/
│   ├── exceptions/
│   │   └── branch.exceptions.ts            # BranchNotFound, DuplicateCode, etc.
│   ├── models/
│   │   └── branch.entity.ts                # Entidad Branch con updateDetails
│   └── ports/
│       └── branch-repository.port.ts       # Puerto: persistencia de sucursales
└── infrastructure/
    ├── branch.module.ts                    # Módulo NestJS
    ├── http/
    │   ├── branches.controller.ts          # Endpoints: /api/v1/branches/*
    │   └── dtos/
    │       └── branch.dtos.ts              # DTOs: CreateBranchDto, UpdateBranchDto
    └── persistence/
        └── postgres-branch.repository.ts   # Repositorio PostgreSQL para sucursales
```

### 📦 RBAC (`src/contexts/rbac/`)

```
rbac/
├── application/
│   ├── dtos/
│   │   └── assign-role.dto.ts              # DTO para asignar rol
│   └── use-cases/
│       └── assign-role.use-case.ts         # Lógica de asignación de roles con blindaje jerárquico
├── domain/
│   ├── exceptions/
│   │   └── insufficient-permissions.exception.ts  # Excepción de permisos insuficientes
│   ├── models/
│   │   └── role.enum.ts                    # Definición de roles: OWNER, ADMIN, ACCOUNTANT, etc.
│   └── ports/
│       └── rbac-session-invalidator.port.ts  # Puerto: invalidación de sesiones por cambio de rol
└── infrastructure/
    ├── rbac.module.ts                      # Módulo NestJS
    ├── decorators/
    │   └── roles.decorator.ts              # @Roles('OWNER', 'ADMIN') — decorador de metadatos
    └── guards/
        └── roles.guard.ts                  # Guard que verifica el rol del request contra los permitidos
```

### 📦 Audit (`src/contexts/audit/`)

```
audit/
├── application/
│   ├── dtos/
│   │   └── audit-query.dto.ts              # DTO de query params (page, limit)
│   └── use-cases/
│       └── get-user-audit-trail.use-case.ts  # Consulta bitácora de auditoría por usuario
├── domain/
│   ├── models/
│   │   └── audit-log.entity.ts             # Entidad AuditLog (inmutable, solo lectura)
│   └── ports/
│       └── audit-repository.port.ts        # Puerto: consulta de logs de auditoría
└── infrastructure/
    ├── audit.module.ts                     # Módulo NestJS
    └── persistence/
        └── postgres-audit.repository.ts    # Repositorio PostgreSQL para auditoría
```

---

## Código Compartido (`src/shared/`)

```
shared/
├── domain/
│   ├── base.entity.ts                      # Clase abstracta BaseTenantEntity (id, tenantId, timestamps)
│   ├── domain.exception.ts                 # Clase base DomainException (message, code, statusCode)
│   ├── pagination.ts                       # Interfaces de paginación
│   └── security-context.interface.ts       # Interface SecurityContext (userId, tenantId, role)
│
└── infrastructure/
    ├── config/
    │   ├── config.module.ts                # Módulo de configuración centralizada con ConfigModule
    │   ├── database.config.ts              # Factory de opciones de TypeORM (lee de .env)
    │   ├── env.validation.ts               # Validación de variables de entorno requeridas
    │   └── redis.config.ts                 # Factory de opciones de Redis (lee de .env)
    │
    ├── http/
    │   ├── decorators/
    │   │   └── rate-limit.decorator.ts     # @RateLimit({ limit, ttlSeconds }) decorador
    │   ├── exceptions/
    │   │   └── rate-limit.exception.ts     # Excepción HTTP 429 Too Many Requests
    │   ├── filters/
    │   │   └── domain-exception.filter.ts  # Filtro global que mapea DomainException → HTTP response
    │   ├── guards/
    │   │   └── rate-limit.guard.ts         # Guard de rate limiting con contadores en Redis
    │   ├── health/
    │   │   ├── health.controller.ts        # GET /health y GET /api/v1/health
    │   │   ├── health.module.ts            # Módulo de health check
    │   │   └── health.service.ts           # Servicio que verifica PostgreSQL y Redis
    │   ├── interfaces/
    │   │   └── authenticated-request.interface.ts  # Tipo del request con user JWT
    │   └── middleware/
    │       └── correlation-id.middleware.ts # Middleware que asigna X-Correlation-Id a cada request
    │
    ├── persistence/
    │   ├── base-postgres.repository.ts     # Clase abstracta base para repositorios PostgreSQL
    │   ├── database-options.factory.ts     # Factory de TypeORM DataSourceOptions
    │   ├── database.module.ts              # Módulo de conexión a PostgreSQL
    │   ├── database.service.ts             # Servicio: verifica conexión y crea constraints
    │   ├── rls/
    │   │   ├── rls.constants.ts            # Variables de sesión PostgreSQL (app.current_tenant_id, etc.)
    │   │   ├── rls.context.ts              # AsyncLocalStorage para propagar el QueryRunner
    │   │   ├── rls-entity-manager.decorator.ts  # Decorador @RlsEntityManager() para controllers
    │   │   ├── rls.interceptor.ts          # Interceptor global: abre TX, configura RLS, commit/rollback
    │   │   └── rls.module.ts              # Módulo que registra el RlsInterceptor globalmente
    │   └── seeds/
    │       └── seed.ts                     # Script de siembra: crea tenants, branches, users y audit logs
    │
    └── redis/
        ├── redis.module.ts                 # Módulo de conexión a Redis (singleton)
        └── redis.service.ts                # Servicio Redis: conexión, health check, shutdown
```

---

## Conteo de Archivos por Módulo

| Módulo | Archivos `.ts` |
|--------|:---------:|
| Auth | 22 |
| User | 7 |
| Tenant | 10 |
| Branch | 7 |
| RBAC | 6 |
| Audit | 4 |
| Shared | 18 |
| Raíz (main, app.module) | 2 |
| **Total** | **~76** |
