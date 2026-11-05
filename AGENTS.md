# Code Review Rules — Core Architecture RLS & RBAC

## TypeScript & Code Quality
- Strict TypeScript: no `any` types.
- Follow ESM imports with `.js` extensions.
- Clean Architecture (Hexagonal): strict separation between Domain, Application, and Infrastructure.
- Strict NO comments rule: do not include `//` or `/* */` comments in source code.

## Security & Architecture
- Multi-tenant isolation: always use PostgreSQL RLS (`app.current_tenant_id`) via transaction query runner.
- RBAC permissions: enforce `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(...)`.
- Input validation: all DTOs must use `class-validator` and Swagger decorators.
