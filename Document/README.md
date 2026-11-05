# 📚 Documentación Técnica — squad1_core_architecture_rls_rbac

> **Repositorio:** `squad1_core_architecture_rls_rbac`
> **Proyecto:** API SaaS Contable Multi-Tenant — Core Architecture
> **Stack:** NestJS 12 · TypeScript 6 · PostgreSQL 16 · Redis 7 · Docker Compose

---

## 🎯 ¿Qué es este repositorio?

Este repositorio contiene la **arquitectura base (Core)** de un sistema contable tipo SaaS (Software as a Service). Su propósito es proveer los cimientos de seguridad, aislamiento de datos y control de acceso que consumirán los demás módulos del diplomado (facturación, inventario, nómina, etc.).

El sistema implementa tres pilares fundamentales:

1. **Multi-Tenancy con RLS (Row-Level Security):** Cada empresa (tenant) tiene sus datos completamente aislados a nivel de base de datos PostgreSQL.
2. **RBAC (Role-Based Access Control):** 5 roles jerárquicos con permisos granulares por endpoint.
3. **Autenticación JWT con sesiones en Redis:** Login, refresh tokens, logout e invalidación centralizada de sesiones.

---

## 🗂️ Índice de Documentación

| # | Documento | Descripción |
|---|-----------|-------------|
| 1 | [🏗️ Arquitectura General](./01-ARQUITECTURA.md) | Visión de alto nivel: capas, patrones, tecnologías y decisiones de diseño |
| 2 | [📂 Estructura del Proyecto](./02-ESTRUCTURA-PROYECTO.md) | Árbol de carpetas comentado — qué hace cada archivo y dónde encontrarlo |
| 3 | [🔐 Seguridad: RLS + RBAC](./03-SEGURIDAD-RLS-RBAC.md) | Cómo funciona Row-Level Security y el control de acceso por roles |
| 4 | [📡 Catálogo de Endpoints (API)](./04-CATALOGO-ENDPOINTS.md) | Todos los endpoints REST, sus métodos, parámetros, roles y respuestas |
| 5 | [🗄️ Modelo de Datos](./05-MODELO-DATOS.md) | Entidades de dominio, tablas PostgreSQL y relaciones |
| 6 | [🚀 Guía de Instalación y Ejecución](./06-GUIA-INSTALACION.md) | Cómo clonar, configurar, sembrar datos y correr el proyecto paso a paso |
| 7 | [🧪 Datos de Prueba (Seed)](./07-DATOS-PRUEBA-SEED.md) | Credenciales preconfiguradas, empresas y usuarios del seed |
| 8 | [📋 Auditoría Técnica y de Seguridad](./08-AUDITORIA-TECNICA.md) | Dictamen de calidad, cumplimiento OWASP API Security, Clean Architecture y resiliencia |
| 9 | [🤖 Contexto y Prompt para IAs](./09-CONTEXTO-PARA-IA.md) | Prompt maestro para alimentar ChatGPT, Claude, Cursor o Gemini y snippets de integración |
| 10 | [🔄 Recuperación de Contraseña](./password-recovery/README.md) | Flujo self-service de olvido de contraseña *(documentación específica)* |

---

## 🏗️ Principios Arquitectónicos Clave

```
┌──────────────────────────────────────────────────────────┐
│                    Clean Architecture                     │
│  (Hexagonal / Ports & Adapters / Domain-Driven Design)   │
├──────────────────────────────────────────────────────────┤
│  DOMINIO         → Entidades, Value Objects, Excepciones │
│  APLICACIÓN      → Casos de Uso (Orchestrators)          │
│  INFRAESTRUCTURA → Controllers, Repositories, Adapters   │
└──────────────────────────────────────────────────────────┘
```

- **Inversión de Dependencias:** Los casos de uso dependen de *puertos* (interfaces), no de implementaciones concretas.
- **Bounded Contexts:** Cada módulo (Auth, User, Tenant, Branch, RBAC, Audit) es un contexto acotado independiente.
- **RLS Transparente:** Un interceptor NestJS configura automáticamente las variables de sesión PostgreSQL para que cada query solo vea los datos de su tenant.

---

## 🔗 Recursos del Repositorio

| Recurso | Ubicación |
|---------|-----------|
| Colección Postman | [`mock/postman-collection.json`](../mock/postman-collection.json) |
| Especificación OpenAPI | [`mock/openapi.json`](../mock/openapi.json) |
| Swagger UI (local) | `http://localhost:3000/api/docs` |
| Manual de Roles y Permisos | [`ROLES.md`](../ROLES.md) |
| Variables de Entorno | [`.env.example`](../.env.example) |
| Docker Compose | [`docker-compose.yml`](../docker-compose.yml) |

---

## 👥 Convenciones del Equipo

- **Lenguaje del código:** TypeScript estricto (`strict: true`), sin `any`.
- **Linter:** OxLint con type-aware checking.
- **Formatter:** Prettier con tabs de 2 espacios.
- **Módulo system:** ESM nativo (`"type": "module"` en package.json).
- **Nomenclatura de archivos:** `kebab-case` para archivos, `PascalCase` para clases y entidades.
- **Soft Delete:** Las eliminaciones no borran registros — marcan `is_active = false`.
