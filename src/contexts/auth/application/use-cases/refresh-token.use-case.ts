import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TOKEN_SERVICE_PORT } from '../../domain/ports/token-service.port.js';
import type { TokenServicePort } from '../../domain/ports/token-service.port.js';
import { SESSION_CACHE_PORT } from '../../domain/ports/session-cache.port.js';
import type { SessionCachePort } from '../../domain/ports/session-cache.port.js';
import { USER_REPOSITORY_PORT } from '../../../user/domain/ports/user-repository.port.js';
import type { UserRepositoryPort } from '../../../user/domain/ports/user-repository.port.js';
import type { AuthResult } from '../../domain/models/auth-result.js';
import {
  InvalidCredentialsException,
  SessionExpiredException,
} from '../../domain/exceptions/auth.exceptions.js';

export interface RefreshCommand {
  readonly refreshToken: string;
}

const SESSION_TTL = 28800;

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKEN_SERVICE_PORT)
    private readonly tokenService: TokenServicePort,
    @Inject(SESSION_CACHE_PORT)
    private readonly sessionCache: SessionCachePort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(command: RefreshCommand): Promise<AuthResult> {
    let payload;
    try {
      payload = await this.tokenService.verify(command.refreshToken);
    } catch {
      throw new InvalidCredentialsException();
    }

    const isActive = await this.sessionCache.isSessionActive(payload.sub, payload.jti);
    if (!isActive) {
      throw new SessionExpiredException();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new InvalidCredentialsException();
    }

    // Invalidate old session
    await this.sessionCache.invalidateSession(payload.sub, payload.jti);

    const newJti = uuidv4();
    const newPayload = {
      sub: user.id,
      userId: user.id,
      jti: newJti,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
    };

    const accessToken = this.tokenService.sign(newPayload);
    const refreshToken = this.tokenService.signRefresh(newPayload);

    await this.sessionCache.saveSession(user.id, newJti, SESSION_TTL);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        role: user.role,
      },
    };
  }
}
