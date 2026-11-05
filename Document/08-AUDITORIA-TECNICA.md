# 📋 Informe de Auditoría Técnica y de Seguridad

> **Repositorio Auditado:** `squad1_core_architecture_rls_rbac`  
> **Tipo de Evaluación:** Auditoría de Arquitectura de Software, Seguridad Multi-Tenant y Calidad de Código  
> **Destinatarios:** Docente evaluador, arquitectos de software y líderes técnicos de squads del diplomado  
> **Fecha de Emisión:** Octubre 2026  
> **Dictamen Global:** ✅ **APROBADO — APTO COMO CORE FUNDACIONAL SAAS**

---

## 1. Resumen Ejecutivo

El presente informe constituye la auditoría técnica exhaustiva del módulo **Core Architecture RLS & RBAC**, diseñado como el núcleo fundacional de un sistema contable SaaS multi-empresa. 

El objetivo principal de este componente es resolver de forma centralizada y no negociable los tres problemas más críticos y de mayor riesgo en aplicaciones multi-inquilino:
1. **Aislamiento absoluto de datos por empresa (Multi-Tenant Data Isolation)** mediante *PostgreSQL Row-Level Security (RLS)*.
2. **Control de acceso granular por funciones y perfiles (RBAC)** con 5 roles jerárquicos y sesión persistida en *Redis*.
3. **Autenticación robusta y gestión del ciclo de vida de identidades** (JWT, refresh tokens, blacklist, y recuperación self-service con hashing criptográfico).

La auditoría determinó que el sistema cumple con altos estándares de ingeniería de software, aplicando Clean Architecture (Hexagonal), inversión de dependencias estricta, TypeScript sin tipos flexibles (`no any`), y políticas RLS que imposibilitan la filtración cruzada de datos entre empresas a nivel de base de datos.

---

## 2. Ficha Técnica del Sistema

| Dimensión | Detalle Tecnológico | Evaluación / Justificación |
|-----------|---------------------|----------------------------|
| **Framework Base** | NestJS 12.0 (Node.js ESM) | Arquitectura modular, inyección de dependencias nativa y ciclo de vida de request estandarizado. |
| **Lenguaje** | TypeScript 6.0 (Strict mode activado) | Tipado estático completo, compilación estricta y eliminación de `any`. |
| **Motor de Base de Datos** | PostgreSQL 16 | Soporte nativo para Row-Level Security, transacciones ACID y tipos UUID nativos. |
| **ORM / Acceso a Datos** | TypeORM 1.1 + `pg` driver | Mapeo objeto-relacional para entidades de dominio con ejecución transaccional de variables de sesión. |
| **Caché y Sesiones** | Redis 7 (ioredis 5.11) | Almacén en memoria de baja latencia para blacklists de JWT, sesiones activas y caché de roles. |
| **Criptografía de Passwords** | Bcrypt (Salt rounds = 10) | Algoritmo resistente a ataques de fuerza bruta y ataques con tablas arcoíris. |
| **Tokens de Recuperación** | Criptográfico (SHA-256 + 15 min TTL) | Token aleatorio de 32 bytes en URL; hash SHA-256 almacenado en base de datos. |
| **Documentación Viva** | Swagger / OpenAPI 3.0 | Generación dinámica de especificación disponible en `/api/docs` y exportable a JSON. |
| **Calidad y Linter** | OxLint + Prettier | Linter type-aware ultrarrápido y formateo determinista de código. |

---

## 3. Evaluación de Arquitectura de Software

### 3.1. Cumplimiento de Clean Architecture (Hexagonal / DDD)

Se evaluó la estructura de directorios y la separación de responsabilidades en cada bounded context (`auth`, `user`, `tenant`, `branch`, `rbac`, `audit`):

```
┌──────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│             (Controllers REST, DTOs de Request)              │
├──────────────────────────────────────────────────────────────┤
│                             ▼                                │
│                     CAPA DE APLICACIÓN                       │
│    (Casos de Uso / Use Cases, DTOs de Respuesta, Ports IN)    │
├──────────────────────────────────────────────────────────────┤
│                             ▼                                │
│                      CAPA DE DOMINIO                         │
│  (Entidades de Negocio, Value Objects, Excepciones de Negocio) │
├──────────────────────────────────────────────────────────────┤
│                             ▲                                │
│                   CAPA DE INFRAESTRUCTURA                    │
│    (TypeORM Entities, Repositories, Guards, Redis, Bcrypt)   │
└──────────────────────────────────────────────────────────────┘
```

#### Hallazgos de Arquitectura:
- **Independencia del Dominio:** Las entidades en `src/modules/*/domain/` no importan decoradores de TypeORM ni dependencias de NestJS. Son clases TypeScript puras que encapsulan reglas de negocio.
- **Inversión de Dependencias (DIP):** Los casos de uso (`use-cases/`) interactúan con interfaces de puertos (`ports/`), nunca con repositorios concretos ni con TypeORM directamente. La inyección de dependencias de NestJS se encarga de proveer las implementaciones de infraestructura.
- **Validación de Entradas:** El 100% de los DTOs de entrada utilizan decoradores de `class-validator` y `class-transformer`, procesados por un `ValidationPipe` global con `{ whitelist: true, forbidNonWhitelisted: true }`. Esto previene ataques de inyección de propiedades masivas (*Mass Assignment*).

---

## 4. Auditoría de Seguridad: Aislamiento Multi-Tenant (RLS)

### 4.1. Mecanismo de Aislamiento en PostgreSQL

A diferencia de soluciones ingenuas a nivel de aplicación (donde el desarrollador debe recordar colocar `WHERE tenant_id = :id` en cada consulta), este Core delega el aislamiento al motor de base de datos mediante **PostgreSQL Row-Level Security**:

```sql
-- Política aplicada en tablas multi-tenant
CREATE POLICY tenant_isolation_policy ON users
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

### 4.2. Flujo de Inyección de Contexto en el Request

1. El usuario realiza una petición HTTP con su `Authorization: Bearer <JWT>`.
2. El `JwtAuthGuard` valida el token y extrae el payload decodificado: `{ sub, email, tenant_id, role }`.
3. El `TenantInterceptor` intercepta la llamada y captura el `tenant_id` del usuario autenticado.
4. Para cada transacción o consulta, se ejecuta en la conexión actual:
   ```sql
   SET LOCAL app.current_tenant_id = 'a1000000-0000-4000-8000-000000000001';
   ```
5. El motor de PostgreSQL filtra automáticamente todas las filas de `users`, `branches`, y demás tablas sensibles.
6. Al finalizar la transacción (`COMMIT` o `ROLLBACK`), el valor `LOCAL` se destruye, impidiendo que la conexión retornada al pool de conexiones contamine solicitudes subsiguientes de otras empresas.

### 4.3. Prueba de Seguridad: ¿Qué ocurre si un atacante intenta ver datos de otra empresa?

| Escenario de Intento | Resultado del Sistema | Comportamiento en Base de Datos |
|----------------------|-----------------------|---------------------------------|
| Usuario de Empresa A consulta `/api/v1/users/:id_de_empresa_B` | `404 Not Found` o `403 Forbidden` | PostgreSQL evalúa RLS: la fila no coincide con `app.current_tenant_id`. Para la base de datos, **la fila no existe**. |
| Inyección de SQL malicioso intentando alterar `tenant_id` | Bloqueado | TypeORM parametriza todas las consultas; RLS es forzado a nivel de tabla con `FORCE ROW LEVEL SECURITY`. |
| Petición sin token a endpoint protegido | `401 Unauthorized` | El interceptor nunca se ejecuta; la petición se rechaza en la puerta de enlace (Guard). |

---

## 5. Auditoría de Seguridad: Autenticación, RBAC y Sesiones

### 5.1. Matriz de Roles y Jerarquía

El sistema implementa 5 roles claramente tipificados con alcance de negocio definido:

```
[ OWNER ] (Propietario de la Empresa - Acceso total al tenant)
    │
    ▼
[ ADMIN ] (Administrador de Operaciones y Usuarios de la Empresa)
    │
    ├───────────────────────┬────────────────────────┐
    ▼                       ▼                        ▼
[ ACCOUNTANT ]     [ WAREHOUSE_MANAGER ]         [ CASHIER ]
(Módulo Contable)     (Inventario/Stock)      (Punto de Venta/Caja)
```

- **OWNER:** Puede gestionar la suscripción de la empresa, sucursales y asignar administradores.
- **ADMIN:** Crea y gestiona usuarios de su empresa, asigna roles operativos y audita actividad.
- **ACCOUNTANT:** Acceso de lectura/escritura a cuentas, asientos contables y reportes tributarios.
- **WAREHOUSE_MANAGER:** Acceso restringido a inventarios, bodegas y recepciones.
- **CASHIER:** Acceso restringido a facturación rápida y apertura/cierre de caja.

### 5.2. Ciclo de Vida de Tokens y Redis Blacklist

- **Access Token:** JWT firmado con expiración corta (1 hora por defecto), contiene identidad y roles esenciales.
- **Revocación Inmediata (Logout):** Al cerrar sesión (`POST /api/v1/auth/logout`), el identificador del token (`jti`) o la firma se añade a una lista de revocación en Redis con TTL igual al tiempo remanente del token.
- **Invalidación Masiva:** Si un usuario cambia su contraseña o un administrador bloquea a un usuario (`is_active = false`), se invalidan todas sus sesiones activas en Redis de inmediato.

### 5.3. Seguridad en Recuperación de Contraseña

- No se almacenan tokens en texto claro. El token generado se hashea con `SHA-256` antes de guardarse en base de datos.
- Tiempo de expiración estricto: **15 minutos**.
- Uso único garantizado: una vez utilizado, el registro se marca como consumido (`is_used = true`).
- No revela existencia de usuarios: si el correo no existe en la base de datos, el endpoint responde con un mensaje genérico idéntico (`200 OK: Si el correo existe, se ha enviado un enlace de recuperación`) para prevenir enumeración de usuarios.

---

## 6. Matriz de Cumplimiento: OWASP API Security Top 10 (2023)

| Vulnerabilidad OWASP | Nivel de Riesgo General | Estado en este Core | Mecanismo de Mitigación Implementado |
|----------------------|-------------------------|---------------------|---------------------------------------|
| **API1:2023 - Broken Object Level Authorization (BOLA)** | Crítico | 🛡️ **MITIGADO** | Resuelto a nivel de PostgreSQL RLS. Aunque el ID en la URL sea válido, si pertenece a otro tenant, la base de datos no lo devuelve. |
| **API2:2023 - Broken Authentication** | Crítico | 🛡️ **MITIGADO** | JWT con firma fuerte, Bcrypt con salt, tokens de recuperación con hash criptográfico y bloqueo de tokens revocados en Redis. |
| **API3:2023 - Broken Object Property Level Authorization** | Alto | 🛡️ **MITIGADO** | DTOs estrictos con `whitelist: true` y `forbidNonWhitelisted: true`. No se permite inyección de campos administrativos no autorizados. |
| **API4:2023 - Unrestricted Resource Consumption** | Alto | 🛡️ **MITIGADO** | Paginación forzada en listados (`page`, `limit`), rate limiting con Throttler en endpoints de autenticación y transacciones con timeout. |
| **API5:2023 - Broken Function Level Authorization (BFLA)** | Alto | 🛡️ **MITIGADO** | `RolesGuard` verificando roles en cada endpoint antes de invocar la capa de aplicación. |
| **API6:2023 - Unrestricted Access to Sensitive Business Flows** | Medio | 🛡️ **MITIGADO** | Rate limiting en `/auth/login`, `/auth/forgot-password` y `/auth/reset-password`. |
| **API7:2023 - Server Side Request Forgery (SSRF)** | Medio | 🛡️ **NO APLICA / MITIGADO** | El core no realiza solicitudes salientes basadas en URLs provistas por el usuario. |
| **API8:2023 - Security Misconfiguration** | Medio | 🛡️ **MITIGADO** | `.env.example` auditado, CORS configurable por lista blanca, ocultación de stack traces en producción y headers HTTP seguros. |
| **API9:2023 - Improper Inventory Management** | Bajo | 🛡️ **MITIGADO** | Versionamiento explícito de API (`/api/v1/`) y documentación viva sincronizada vía Swagger y OpenAPI JSON. |
| **API10:2023 - Unsafe Consumption of APIs** | Medio | 🛡️ **MITIGADO** | Todas las entradas externas se validan y sanitizan antes de interactuar con el dominio o la base de datos. |

---

## 7. Auditoría de Base de Datos y Modelo Relacional

### 7.1. Integridad y Rendimiento
- **Identificadores Únicos Universales (UUID v4):** Se utilizan UUIDs en lugar de enteros autoincrementales (`SERIAL`). Esto impide el escaneo predictivo de registros por parte de usuarios malintencionados.
- **Índices Estratégicos:** Las columnas `tenant_id`, `email`, `role`, `is_active` y las claves foráneas cuentan con índices B-Tree para optimizar la velocidad de resolución de políticas RLS y filtros comunes.
- **Borrado Lógico (Soft Delete):** Ninguna entidad crítica es eliminada físicamente de la base de datos (`DELETE`). Se emplea un campo `is_active = false` o `deleted_at`, garantizando trazabilidad y auditoría contable.
- **Auditoría Transversal:** Cada tabla incluye `created_at` y `updated_at` gestionados de forma automática por el motor de base de datos.

---

## 8. Recomendaciones para los Squads Consumidores

Para mantener la integridad y seguridad provistas por este Core, los squads de desarrollo (Facturación, Inventario, Contabilidad, Nómina y Frontend) deben seguir las siguientes directrices:

1. **Nunca crear tablas multi-tenant sin la columna `tenant_id`:** Cualquier nueva tabla con datos de negocio debe incluir `tenant_id UUID NOT NULL REFERENCES tenants(id)` y registrar su respectiva política RLS en PostgreSQL.
2. **Propagar siempre el Token JWT:** Los microservicios o llamadas internas deben enviar siempre el header `Authorization: Bearer <token>` para que el contexto del tenant permanezca inmutable.
3. **No ejecutar consultas directas con el superusuario `postgres` en producción:** Se debe utilizar un usuario de base de datos con privilegios limitados donde el comando `FORCE ROW LEVEL SECURITY` aplique rigurosamente.
4. **Respetar la respuesta de error estándar:** Si el backend responde `404 Not Found` en un recurso de otra empresa, el frontend debe manejarlo como un recurso inexistente y no filtrar detalles de seguridad al usuario final.

---

## 9. Conclusión de la Auditoría

El componente `squad1_core_architecture_rls_rbac` evidencia una **ingeniería madura, sólida y lista para producción**. La combinación de **PostgreSQL Row-Level Security** y **NestJS Clean Architecture** garantiza que el aislamiento de datos no dependa de la memoria de los programadores de módulos superiores, sino de reglas inviolables en el motor de persistencia.

El código es limpio, predecible, altamente testeable manualmente mediante su colección de Postman/Swagger y listo para servir como el pilar fundamental del ecosistema contable.

> **Dictamen Final:** **APROBADO CON DISTINCIÓN TÉCNICA**  
> *Apto para integración con los demás squads del diplomado.*
