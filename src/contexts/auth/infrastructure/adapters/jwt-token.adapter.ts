import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { TokenServicePort, TokenPayload } from '../../domain/ports/token-service.port.js';

@Injectable()
export class JwtTokenAdapter implements TokenServicePort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign({ ...payload });
  }

  signRefresh(payload: TokenPayload): string {
    return this.jwtService.sign({ ...payload }, { expiresIn: '7d' });
  }

  async verify(token: string): Promise<TokenPayload> {
    const secret = this.configService.get<string>('JWT_SECRET');
    return this.jwtService.verifyAsync<TokenPayload>(token, { secret });
  }
}
