import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  Logger,
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
  private readonly logger = new Logger(JwtAuthGuard.name);

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

      try {
        const isActive = await this.sessionCache.isSessionActive(
          payload.sub,
          payload.jti,
        );
        if (!isActive) {
          throw new SessionExpiredException();
        }
      } catch (cacheErr) {
        if (cacheErr instanceof SessionExpiredException) {
          throw cacheErr;
        }
        if (cacheErr instanceof SessionCacheUnavailableException) {
          const isStrict = process.env.AUTH_SESSION_CACHE_STRICT === 'true';
          if (isStrict) {
            throw cacheErr;
          }
          this.logger.warn(
            `Redis session cache no disponible para usuario ${payload.sub}. Fail-open/degraded mode aplicado por firma JWT válida.`,
          );
        } else {
          throw cacheErr;
        }
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
