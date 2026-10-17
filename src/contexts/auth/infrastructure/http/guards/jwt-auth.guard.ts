import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_SERVICE_PORT } from '../../../domain/ports/token-service.port.js';
import type { TokenServicePort } from '../../../domain/ports/token-service.port.js';
import { SESSION_CACHE_PORT } from '../../../domain/ports/session-cache.port.js';
import type { SessionCachePort } from '../../../domain/ports/session-cache.port.js';
import {
  InvalidTokenException,
  SessionExpiredException,
  SessionCacheUnavailableException,
} from '../../../domain/exceptions/auth.exceptions.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE_PORT)
    private readonly tokenService: TokenServicePort,
    @Inject(SESSION_CACHE_PORT)
    private readonly sessionCache: SessionCachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new InvalidTokenException();
    }

    try {
      const payload = await this.tokenService.verify(token);

      const isActive = await this.sessionCache.isSessionActive(
        payload.sub,
        payload.jti,
      );
      if (!isActive) {
        throw new SessionExpiredException();
      }

      (request as any).user = {
        ...payload,
        userId: payload.userId ?? payload.sub,
      };
    } catch (err) {
      if (
        err instanceof SessionExpiredException ||
        err instanceof SessionCacheUnavailableException
      ) {
        throw err;
      }
      throw new InvalidTokenException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
