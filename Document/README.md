# 📚 Documentación Técnica del Proyecto — Core Architecture RLS & RBAC

Bienvenido al centro de documentación técnica del proyecto **Core Architecture RLS & RBAC** (SaaS Contable Multi-Tenant).

Este repositorio centraliza las especificaciones técnicas, guías de integración de endpoints, arquitectura de dominio y documentación de pruebas para facilitar la colaboración entre equipos (Frontend, Backend, QA e integradores).

---

## 🗂️ Índice de Módulos Documentados

| Módulo / Funcionalidad | Descripción | Carpeta / Documento |
|---|---|---|
| **Recuperación de Contraseña (Self-Service)** | Flujo autónomo de recuperación de contraseña vía correo electrónico con tokens temporales de un solo uso en Redis. | [📁 `password-recovery/`](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/Document/password-recovery/README.md) |
| **Batería de Pruebas (Test Suite)** | Documentación y evidencias de ejecución de las pruebas unitarias y de no-regresión de recuperación de contraseñas. | [📁 `tests/password-recovery-tests.md`](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/Document/tests/password-recovery-tests.md) |

---

## 🏗️ Principios Arquitectónicos Clave

1. **Clean Architecture (Hexagonal / DDD):** Separación estricta entre **Dominio** (entidades y puertos), **Aplicación** (casos de uso) e **Infraestructura** (controladores HTTP, adaptadores TypeORM, Redis y simuladores).
2. **Aislamiento Multi-Tenant (RLS):** Row-Level Security activado en PostgreSQL para garantizar que ninguna empresa pueda acceder ni modificar registros de otra.
3. **Control de Acceso Basado en Roles (RBAC):** Jerarquía estricta de permisos entre `OWNER`, `ADMIN`, `ACCOUNTANT`, `WAREHOUSE_MANAGER` y `CASHIER`. Para más información sobre roles, consulta el archivo [ROLES.md](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/ROLES.md).
4. **Seguridad en Sesiones (Redis):** Invalidación centralizada y atómica de tokens JWT y Refresh Tokens ante cambios de credenciales o transferencias de empresa.

---

## 🚀 Guía Rápida para el Equipo

* **Colección de Postman:** Importa el archivo [`mock/postman-collection.json`](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/mock/postman-collection.json) para probar todos los endpoints listos con variables de entorno.
* **Documentación OpenAPI / Swagger:** Disponible localmente en `/api/docs` al iniciar el servidor (`npm run start:dev`) o inspeccionando el archivo [`mock/openapi.json`](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/mock/openapi.json).
* **Ejecutar Pruebas:**
  ```bash
  # Pruebas automatizadas de recuperación de contraseñas
  npm run test:recovery

  # Verificación estricta de código
  npm run lint
  npm run build
  ```
