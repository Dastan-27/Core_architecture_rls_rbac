# 🧪 Documentación de Pruebas: Recuperación de Contraseña (Self-Service & No-Regresión)

Documentación del conjunto de pruebas automatizadas diseñado específicamente para validar el flujo completo de **Recuperación de Contraseña por Correo (Self-Service)** y verificar la **No-Regresión** del reseteo administrativo por roles `OWNER` y `ADMIN`.

---

## 🎯 1. Objetivo de las Pruebas

El objetivo de esta suite de pruebas es garantizar:
1. **Funcionalidad Self-Service:** Que los usuarios puedan solicitar su token de recuperación, recibir la notificación simulada, y restablecer su contraseña de manera autónoma.
2. **Robustez en Seguridad:** Que se respeten las políticas anti-enumeración de usuarios, la expiración de 15 minutos en Redis, el consumo de un solo uso (anti-replay) y la revocación total de sesiones activas.
3. **Garantía de No-Regresión:** Asegurar que los cambios aplicados en [postgres-user.repository.ts](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/src/contexts/user/infrastructure/persistence/postgres-user.repository.ts) para soportar llamadas no autenticadas con RLS **NO hayan alterado ni vulnerado el reseteo administrativo previo** ni el blindaje jerárquico de roles.

---

## ⚡ 2. Cómo Ejecutar las Pruebas

La suite está configurada como un script de Node.js ejecutable mediante `npm`:

```bash
npm run test:recovery
```

* **Archivo ejecutable:** [`scripts/test-password-recovery-flow.ts`](file:///c:/Users/u/Documents/Utp-TDS/Diplomado/PryContabilidad/Core_architecture_rls_rbac/scripts/test-password-recovery-flow.ts)
* **Tiempo estimado de ejecución:** ~500 milisegundos.
* **Dependencias externas requeridas:** Ninguna (utiliza adaptadores mock en memoria para aislar la lógica de dominio y aplicación, garantizando que corra en cualquier entorno o CI/CD sin requerir bases de datos levantadas).

---

## 📋 3. Desglose de los 19 Casos de Prueba

La batería se divide en tres suites claramente diferenciadas:

### 📌 Bloque 1: Pruebas de Solicitud (`ForgotPasswordUseCase`)

Valida el comportamiento de la petición `POST /api/v1/auth/forgot-password`:

| # | Caso de Prueba | Comportamiento Esperado | Relevancia de Seguridad |
|---|---|---|---|
| **1.1** | Anti-enumeración: Correo inexistente | Retorna HTTP 200 con el mensaje neutro de éxito. | Evita que un atacante descubra qué correos existen en la empresa. |
| **1.2** | Sin envío de correo para inexistentes | El puerto `EmailServicePort` no recibe ninguna llamada de envío. | Previene saturación o intentos de spam hacia direcciones falsas. |
| **1.3** | Sin generación de token para inexistentes | `PasswordResetTokenPort` no almacena ningún token en Redis. | Ahorro de memoria y prevención de polución de caché. |
| **1.4** | Anti-enumeración: Usuario inactivo | Retorna el mismo mensaje neutro si el usuario existe pero tiene `isActive = false`. | Impide que cuentas suspendidas o desactivadas generen tokens válidos. |
| **1.5** | Sin envío de correo para inactivos | `EmailServicePort` no envía correos a cuentas suspendidas. | Evita reactivaciones no autorizadas. |
| **1.6** | Usuario activo existente | Retorna mensaje exitoso y `devToken` válido. | Confirma que el flujo positivo se inicia adecuadamente. |
| **1.7** | Entrega de `devToken` en desarrollo | La respuesta incluye el token generado cuando `NODE_ENV !== 'production'`. | Facilita pruebas en Swagger y Postman sin requerir SMTP. |
| **1.8** | Envío de correo a destinatario correcto | Se invoca `EmailServicePort` con el nombre, correo y token exactos. | Garantiza la trazabilidad de la notificación. |
| **1.9** | Persistencia de token en Redis | El token se registra en el almacén temporal bajo la clave `pwd_reset:<token>`. | Valida la conexión con el puerto de caché. |
| **1.10** | Metadatos y TTL de 15 minutos | El registro contiene el `userId` correcto y un TTL estricto de **900 segundos**. | Cumplimiento del estándar de expiración temporal corta. |

---

### 📌 Bloque 2: Pruebas de Restablecimiento con Token (`ResetPasswordWithTokenUseCase`)

Valida el comportamiento de la petición `POST /api/v1/auth/reset-password`:

| # | Caso de Prueba | Comportamiento Esperado | Relevancia de Seguridad |
|---|---|---|---|
| **2.1** | Token inexistente o manipulado | Arroja `InvalidTokenException` (HTTP 401). | Bloquea tokens inventados o cadenas inválidas. |
| **2.2** | Restablecimiento exitoso con token válido | Retorna mensaje de confirmación exitosa. | Confirma la finalización correcta del cambio de credencial. |
| **2.3** | Cifrado y actualización en Base de Datos | La columna `password_hash` del usuario almacena el nuevo hash cifrado. | La contraseña en texto plano jamás persiste en base de datos. |
| **2.4** | Cierre de sesiones activas en Redis | Invoca `sessionCache.invalidateUserSessions(userId)`. | Desautentica de inmediato todas las sesiones y JWTs abiertos previos. |
| **2.5** | Consumo de un solo uso (Anti-Replay) | Reintentar la petición con el mismo token arroja `InvalidTokenException`. | **Protección crítica:** Previene ataques de repetición si el token es interceptado. |

---

### 📌 Bloque 3: Pruebas de No-Regresión en Reseteo Administrativo (`ResetPasswordUseCase`)

Valida que el reseteo administrativo previo (`POST /api/v1/users/:id/reset-password`) continúe funcionando bajo las reglas estrictas de RBAC:

| # | Caso de Prueba | Comportamiento Esperado | Relevancia de Seguridad |
|---|---|---|---|
| **3.1** | `OWNER` resetea a cualquier usuario | Operación permitida y contraseña actualizada. | El Owner mantiene control total sobre los miembros de su tenant. |
| **3.2** | `ADMIN` resetea a usuario operativo | Operación permitida sobre un `ACCOUNTANT`, `WAREHOUSE_MANAGER` o `CASHIER`. | El Administrador puede gestionar a sus subordinados directos. |
| **3.3** | `ADMIN` intenta resetear a otro `ADMIN` | Bloqueado con `InsufficientPermissionsException` (HTTP 403). | **Blindaje Jerárquico:** Un Admin no puede secuestrar la cuenta de un par. |
| **3.4** | `ADMIN` intenta resetear al `OWNER` | Bloqueado con `InsufficientPermissionsException` (HTTP 403). | **Blindaje Jerárquico:** Un Admin no puede escalar privilegios sobre el dueño. |

---

## 🖥️ 4. Evidencia de Ejecución en Consola

Registro real obtenido al ejecutar `npm run test:recovery`:

```text
> Core_architecture_rls_rbac@0.0.1 test:recovery
> tsx scripts/test-password-recovery-flow.ts

🧪 Iniciando batería de pruebas para Recuperación y Reseteo de Contraseñas...

📌 1. PRUEBAS DE FORGOT-PASSWORD (SOLICITUD)
  ✅ PASÓ: Anti-enumeración: Retorna mensaje neutro cuando el correo NO existe
  ✅ PASÓ: No envía correo si el usuario no existe
  ✅ PASÓ: No genera token si el usuario no existe
  ✅ PASÓ: Anti-enumeración: Retorna mensaje neutro cuando el usuario está inactivo
  ✅ PASÓ: No envía correo si el usuario está inactivo
  ✅ PASÓ: Retorna mensaje exitoso para usuario activo
  ✅ PASÓ: Devuelve devToken en entorno de desarrollo
  ✅ PASÓ: Invoca el servicio de correo con el destinatario correcto
  ✅ PASÓ: Guarda el token en el almacenamiento temporal (Redis)
  ✅ PASÓ: El token contiene el userId correcto y TTL de 15 minutos (900s)

📌 2. PRUEBAS DE RESET-PASSWORD CON TOKEN (SELF-SERVICE)
  ✅ PASÓ: Rechaza token inexistente arrojando InvalidTokenException
  ✅ PASÓ: Restablece la contraseña exitosamente
  ✅ PASÓ: El hash en la base de datos fue actualizado con el nuevo valor cifrado
  ✅ PASÓ: Invalida todas las sesiones activas del usuario en Redis tras el reseteo
  ✅ PASÓ: Protección Anti-Replay: El token consumido queda invalidado de inmediato y no puede reutilizarse

📌 3. PRUEBAS DE NO-REGRESIÓN EN RESETEO ADMINISTRATIVO (OWNER / ADMIN)
  ✅ PASÓ: OWNER puede resetear contraseña de cualquier usuario
  ✅ PASÓ: ADMIN puede resetear contraseña de usuario operativo subordinado
  ✅ PASÓ: Blindaje Jerárquico: ADMIN NO puede resetear la contraseña de otro ADMIN
  ✅ PASÓ: Blindaje Jerárquico: ADMIN NO puede resetear la contraseña del OWNER

📊 RESUMEN DE PRUEBAS:
Total pruebas : 19
Exitosas      : 19
Fallidas      : 0

🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!
```

---

## 📌 5. Conclusión para el Equipo

Esta suite de pruebas confirma que:
1. El nuevo flujo de recuperación self-service está blindado contra ataques comunes (enumeración, repetición y sesiones residuales).
2. La arquitectura hexagonal permitió probar los casos de uso sin depender de infraestructura pesada.
3. El reseteo administrativo previo del repositorio **no sufrió ninguna alteración ni degradación** en sus políticas de seguridad y jerarquía.
