import { ForgotPasswordUseCase } from '../src/contexts/auth/application/use-cases/forgot-password.use-case.js';
import { ResetPasswordWithTokenUseCase } from '../src/contexts/auth/application/use-cases/reset-password-with-token.use-case.js';
import { ResetPasswordUseCase } from '../src/contexts/user/application/use-cases/user.use-cases.js';
import { InvalidTokenException } from '../src/contexts/auth/domain/exceptions/auth.exceptions.js';
import { InsufficientPermissionsException } from '../src/contexts/rbac/domain/exceptions/insufficient-permissions.exception.js';
import { User } from '../src/contexts/user/domain/models/user.entity.js';
import bcrypt from 'bcrypt';

// ─── Mocks para Pruebas Unitarias ──────────────────────────────────────────

class MockUserRepository {
  public users = new Map<string, User>();
  public passwordHashes = new Map<string, string>();

  async findByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async resetPassword(id: string, tenantId: string, newHash: string): Promise<void> {
    this.passwordHashes.set(id, newHash);
  }
}

class MockResetTokenPort {
  public tokens = new Map<string, { data: any; ttl: number }>();

  async saveResetToken(token: string, data: any, ttlSeconds: number): Promise<void> {
    this.tokens.set(token, { data, ttl: ttlSeconds });
  }

  async getResetToken(token: string): Promise<any | null> {
    const entry = this.tokens.get(token);
    return entry ? entry.data : null;
  }

  async consumeResetToken(token: string): Promise<any | null> {
    const entry = this.tokens.get(token);
    if (!entry) return null;
    this.tokens.delete(token); // Single-use consumption
    return entry.data;
  }
}

class MockEmailService {
  public sentEmails: any[] = [];

  async sendPasswordResetEmail(params: any): Promise<void> {
    this.sentEmails.push(params);
  }
}

class MockPasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return `hashed_${plain}` === hash;
  }
}

class MockSessionCache {
  public invalidatedUsers: string[] = [];

  async invalidateUserSessions(userId: string): Promise<void> {
    this.invalidatedUsers.push(userId);
  }
}

class MockConfigService {
  get(key: string): any {
    if (key === 'NODE_ENV') return 'development';
    return null;
  }
}

// ─── Ejecución del Test Suite ─────────────────────────────────────────────

async function runTests() {
  console.log('🧪 Iniciando batería de pruebas para Recuperación y Reseteo de Contraseñas...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const userRepo = new MockUserRepository();
  const resetTokenPort = new MockResetTokenPort();
  const emailService = new MockEmailService();
  const passwordHasher = new MockPasswordHasher();
  const sessionCache = new MockSessionCache();
  const configService = new MockConfigService();

  // Sembrar usuarios de prueba
  const activeUser = User.create({
    id: 'u-1',
    tenantId: 't-1',
    branchId: null,
    documentType: 'CC',
    documentNumber: '12345678',
    email: 'carlos@empresa.com',
    passwordHash: 'hash_inicial',
    fullName: 'Carlos Contador',
    phone: '3001112233',
    role: 'ACCOUNTANT',
    isActive: true,
  });

  const inactiveUser = User.create({
    id: 'u-2',
    tenantId: 't-1',
    branchId: null,
    documentType: 'CC',
    documentNumber: '87654321',
    email: 'inactivo@empresa.com',
    passwordHash: 'hash_inicial',
    fullName: 'Usuario Inactivo',
    phone: '3001112244',
    role: 'CASHIER',
    isActive: false,
  });

  const adminUser = User.create({
    id: 'u-admin',
    tenantId: 't-1',
    branchId: null,
    documentType: 'CC',
    documentNumber: '11112222',
    email: 'admin@empresa.com',
    passwordHash: 'hash_admin',
    fullName: 'Admin User',
    phone: '3001112255',
    role: 'ADMIN',
    isActive: true,
  });

  const ownerUser = User.create({
    id: 'u-owner',
    tenantId: 't-1',
    branchId: null,
    documentType: 'CC',
    documentNumber: '99998888',
    email: 'owner@empresa.com',
    passwordHash: 'hash_owner',
    fullName: 'Owner User',
    phone: '3001112266',
    role: 'OWNER',
    isActive: true,
  });

  userRepo.users.set(activeUser.id, activeUser);
  userRepo.users.set(inactiveUser.id, inactiveUser);
  userRepo.users.set(adminUser.id, adminUser);
  userRepo.users.set(ownerUser.id, ownerUser);

  const forgotPasswordUseCase = new ForgotPasswordUseCase(
    userRepo as any,
    resetTokenPort as any,
    emailService as any,
    configService as any,
  );

  const resetPasswordWithTokenUseCase = new ResetPasswordWithTokenUseCase(
    resetTokenPort as any,
    userRepo as any,
    passwordHasher as any,
    sessionCache as any,
  );

  const administrativeResetUseCase = new ResetPasswordUseCase(
    userRepo as any,
    sessionCache as any,
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log('📌 1. PRUEBAS DE FORGOT-PASSWORD (SOLICITUD)');
  // ──────────────────────────────────────────────────────────────────────────

  // 1.1 Anti-enumeración con correo inexistente
  const resNonExisting = await forgotPasswordUseCase.execute({ email: 'no_existe@empresa.com' });
  assert(
    resNonExisting.message.includes('Si el correo electrónico se encuentra registrado'),
    'Anti-enumeración: Retorna mensaje neutro cuando el correo NO existe',
  );
  assert(
    emailService.sentEmails.length === 0,
    'No envía correo si el usuario no existe',
  );
  assert(
    resetTokenPort.tokens.size === 0,
    'No genera token si el usuario no existe',
  );

  // 1.2 Anti-enumeración con usuario inactivo
  const resInactive = await forgotPasswordUseCase.execute({ email: 'inactivo@empresa.com' });
  assert(
    resInactive.message.includes('Si el correo electrónico se encuentra registrado'),
    'Anti-enumeración: Retorna mensaje neutro cuando el usuario está inactivo',
  );
  assert(
    emailService.sentEmails.length === 0,
    'No envía correo si el usuario está inactivo',
  );

  // 1.3 Usuario activo existente
  const resActive = await forgotPasswordUseCase.execute({ email: 'carlos@empresa.com' });
  assert(
    resActive.message.includes('Si el correo electrónico se encuentra registrado'),
    'Retorna mensaje exitoso para usuario activo',
  );
  assert(
    typeof resActive.devToken === 'string' && resActive.devToken.length > 10,
    'Devuelve devToken en entorno de desarrollo',
  );
  assert(
    emailService.sentEmails.length === 1 && emailService.sentEmails[0].to === 'carlos@empresa.com',
    'Invoca el servicio de correo con el destinatario correcto',
  );
  assert(
    resetTokenPort.tokens.size === 1,
    'Guarda el token en el almacenamiento temporal (Redis)',
  );

  const generatedToken = resActive.devToken!;
  const tokenMetadata = resetTokenPort.tokens.get(generatedToken);
  assert(
    tokenMetadata?.data.userId === 'u-1' && tokenMetadata?.ttl === 900,
    'El token contiene el userId correcto y TTL de 15 minutos (900s)',
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📌 2. PRUEBAS DE RESET-PASSWORD CON TOKEN (SELF-SERVICE)');
  // ──────────────────────────────────────────────────────────────────────────

  // 2.1 Token inexistente o inválido
  let errorCaught = false;
  try {
    await resetPasswordWithTokenUseCase.execute({
      token: 'token_falso_123',
      newPassword: 'NuevaPassword456*',
    });
  } catch (err) {
    if (err instanceof InvalidTokenException) errorCaught = true;
  }
  assert(errorCaught, 'Rechaza token inexistente arrojando InvalidTokenException');

  // 2.2 Restablecimiento exitoso con token válido
  sessionCache.invalidatedUsers = [];
  const resetRes = await resetPasswordWithTokenUseCase.execute({
    token: generatedToken,
    newPassword: 'MiNuevoPasswordSeguro999*',
  });
  assert(
    resetRes.message.includes('Contraseña restablecida exitosamente'),
    'Restablece la contraseña exitosamente',
  );
  assert(
    userRepo.passwordHashes.get('u-1') === 'hashed_MiNuevoPasswordSeguro999*',
    'El hash en la base de datos fue actualizado con el nuevo valor cifrado',
  );
  assert(
    sessionCache.invalidatedUsers.includes('u-1'),
    'Invalida todas las sesiones activas del usuario en Redis tras el reseteo',
  );

  // 2.3 Reutilización del token (Anti-Replay / Consumo único)
  let replayBlocked = false;
  try {
    await resetPasswordWithTokenUseCase.execute({
      token: generatedToken,
      newPassword: 'OtraPasswordMas*',
    });
  } catch (err) {
    if (err instanceof InvalidTokenException) replayBlocked = true;
  }
  assert(
    replayBlocked,
    'Protección Anti-Replay: El token consumido queda invalidado de inmediato y no puede reutilizarse',
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📌 3. PRUEBAS DE NO-REGRESIÓN EN RESETEO ADMINISTRATIVO (OWNER / ADMIN)');
  // ──────────────────────────────────────────────────────────────────────────

  // 3.1 OWNER resetea contraseña de cualquier usuario
  let ownerResetOk = false;
  try {
    await administrativeResetUseCase.execute({
      id: 'u-1',
      tenantId: 't-1',
      newPasswordHash: 'hash_por_owner',
      requesterRole: 'OWNER',
    });
    ownerResetOk = userRepo.passwordHashes.get('u-1') === 'hash_por_owner';
  } catch (e) {
    ownerResetOk = false;
  }
  assert(ownerResetOk, 'OWNER puede resetear contraseña de cualquier usuario');

  // 3.2 ADMIN resetea contraseña de rol operativo (ACCOUNTANT)
  let adminResetOk = false;
  try {
    await administrativeResetUseCase.execute({
      id: 'u-1',
      tenantId: 't-1',
      newPasswordHash: 'hash_por_admin',
      requesterRole: 'ADMIN',
    });
    adminResetOk = userRepo.passwordHashes.get('u-1') === 'hash_por_admin';
  } catch (e) {
    adminResetOk = false;
  }
  assert(adminResetOk, 'ADMIN puede resetear contraseña de usuario operativo subordinado');

  // 3.3 ADMIN intenta resetear contraseña de otro ADMIN (debe fallar)
  let adminBlockedOnAdmin = false;
  try {
    await administrativeResetUseCase.execute({
      id: 'u-admin',
      tenantId: 't-1',
      newPasswordHash: 'hack_admin',
      requesterRole: 'ADMIN',
    });
  } catch (err) {
    if (err instanceof InsufficientPermissionsException) adminBlockedOnAdmin = true;
  }
  assert(adminBlockedOnAdmin, 'Blindaje Jerárquico: ADMIN NO puede resetear la contraseña de otro ADMIN');

  // 3.4 ADMIN intenta resetear contraseña de OWNER (debe fallar)
  let adminBlockedOnOwner = false;
  try {
    await administrativeResetUseCase.execute({
      id: 'u-owner',
      tenantId: 't-1',
      newPasswordHash: 'hack_owner',
      requesterRole: 'ADMIN',
    });
  } catch (err) {
    if (err instanceof InsufficientPermissionsException) adminBlockedOnOwner = true;
  }
  assert(adminBlockedOnOwner, 'Blindaje Jerárquico: ADMIN NO puede resetear la contraseña del OWNER');

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📊 RESUMEN DE PRUEBAS:');
  console.log(`Total pruebas : ${passed + failed}`);
  console.log(`Exitosas      : ${passed}`);
  console.log(`Fallidas      : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
  }
}

runTests().catch((err) => {
  console.error('Error no controlado en tests:', err);
  process.exit(1);
});
