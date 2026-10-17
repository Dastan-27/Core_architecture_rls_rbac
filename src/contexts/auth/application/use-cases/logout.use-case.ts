import { Inject, Injectable } from '@nestjs/common';
import { SESSION_CACHE_PORT } from '../../domain/ports/session-cache.port.js';
import type { SessionCachePort } from '../../domain/ports/session-cache.port.js';

export interface LogoutCommand {
  readonly userId: string;
  readonly sessionId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_CACHE_PORT)
    private readonly sessionCache: SessionCachePort,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.sessionCache.invalidateSession(command.userId, command.sessionId);
  }
}
