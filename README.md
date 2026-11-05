# 🏢 squad1_core_architecture_rls_rbac

> **API SaaS Contable Multi-Tenant — Arquitectura Base (Core)**  
> **Stack:** NestJS 12 · TypeScript 6 (Strict ESM) · PostgreSQL 16 (RLS) · Redis 7 · Docker  
> **Módulo:** Core Architecture, Row-Level Security & Role-Based Access Control

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12.0-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_RLS-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-dc382d.svg)](https://redis.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Hexagonal-green.svg)](#)

---

## 🎯 Propósito del Repositorio

Este repositorio es el **núcleo fundacional (Core Architecture)** de un sistema SaaS Contable multi-empresa. Provee los cimientos transversales de seguridad, aislamiento de datos e identidades que consumen los demás módulos del sistema (facturación, inventario, nómina, contabilidad, reportes y frontend).

### Los 3 Pilares Fundamentales:
1. 🛡️ **Multi-Tenancy con PostgreSQL Row-Level Security (RLS):** Aislamiento estricto de datos a nivel de motor de base de datos (`SET LOCAL app.current_tenant_id`). Imposible filtrar datos de otra empresa.
2. 👥 **RBAC (Role-Based Access Control):** 5 roles jerárquicos (`OWNER`, `ADMIN`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`, `CASHIER`) con autorización granular por Guards.
3. 🔑 **Autenticación JWT con Sesiones en Redis:** Login, refresh tokens, revocación instantánea (logout/bloqueo) mediante lista negra en Redis y recuperación segura de contraseña por email.

---

## 📚 Documentación Técnica Completa

Toda la documentación técnica detallada se encuentra centralizada en la carpeta [`Document/`](./Document/README.md):

| Documento | Enlace | Contenido Principal |
|-----------|--------|---------------------|
| **Índice General** | [Document/README.md](./Document/README.md) | Visión completa, principios y mapa de la documentación. |
| **01. Arquitectura** | [01-ARQUITECTURA.md](./Document/01-ARQUITECTURA.md) | Capas Clean Architecture, Inversión de Dependencias y flujo de requests. |
| **02. Estructura** | [02-ESTRUCTURA-PROYECTO.md](./Document/02-ESTRUCTURA-PROYECTO.md) | Árbol completo del repositorio comentado archivo por archivo. |
| **03. Seguridad** | [03-SEGURIDAD-RLS-RBAC.md](./Document/03-SEGURIDAD-RLS-RBAC.md) | Explicación a fondo de RLS en Postgres, Guards RBAC y Redis. |
| **04. Endpoints** | [04-CATALOGO-ENDPOINTS.md](./Document/04-CATALOGO-ENDPOINTS.md) | Catálogo REST completo con métodos, payloads y códigos HTTP. |
| **05. Datos** | [05-MODELO-DATOS.md](./Document/05-MODELO-DATOS.md) | Diagrama Entidad-Relación, tablas, campos y relaciones. |
| **06. Instalación** | [06-GUIA-INSTALACION.md](./Document/06-GUIA-INSTALACION.md) | Paso a paso desde clonar hasta correr el backend y Docker. |
| **07. Seed** | [07-DATOS-PRUEBA-SEED.md](./Document/07-DATOS-PRUEBA-SEED.md) | Credenciales universales, usuarios y empresas de prueba. |
| **08. Auditoría** | [08-AUDITORIA-TECNICA.md](./Document/08-AUDITORIA-TECNICA.md) | Evaluación para docentes: OWASP API Security, calidad y dictamen. |
| **09. Contexto IA** | [09-CONTEXTO-PARA-IA.md](./Document/09-CONTEXTO-PARA-IA.md) | **Prompt maestro listo para alimentar ChatGPT, Claude, Cursor o Gemini.** |

---

## ⚡ Inicio Rápido (3 Pasos)

### 1. Clonar y configurar variables de entorno
```bash
git clone <url-del-repositorio> squad1_core_architecture_rls_rbac
cd squad1_core_architecture_rls_rbac
cp .env.example .env
```

### 2. Levantar PostgreSQL y Redis con Docker
```bash
docker compose up -d
```

### 3. Instalar, sembrar datos y arrancar
```bash
npm install
npm run seed        # Inserta empresas, usuarios y roles de prueba
npm run start:dev   # Servidor listo en http://localhost:3000
```

---

## 🧪 Pruebas Rápidas y Recursos para Otros Squads

- **Swagger UI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Colección Postman:** [`mock/postman-collection.json`](./mock/postman-collection.json)
- **Especificación OpenAPI 3.0:** [`mock/openapi.json`](./mock/openapi.json)
- **Contraseña universal del Seed:** `Password123*`
- **Usuario Owner Tenant 1:** `owner@techsolutions.com`
- **Usuario Admin Tenant 1:** `admin@techsolutions.com`

---

## 🤖 ¿Vas a usar una IA para integrar tu módulo?

Copia y pega directamente el contenido de [**`Document/09-CONTEXTO-PARA-IA.md`**](./Document/09-CONTEXTO-PARA-IA.md) en tu asistente (ChatGPT, Claude, Cursor, Copilot o Gemini). Incluye el prompt maestro y snippets de integración en TypeScript/React listos para usar.
