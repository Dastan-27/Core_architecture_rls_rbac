import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RateLimitGuard } from '../../../../shared/infrastructure/http/guards/rate-limit.guard.js';
import { RateLimit } from '../../../../shared/infrastructure/http/decorators/rate-limit.decorator.js';
import {
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordWithTokenDto,
} from '../../application/dtos/auth.dtos.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case.js';
import { ResetPasswordWithTokenUseCase } from '../../application/use-cases/reset-password-with-token.use-case.js';
import type { AuthenticatedRequest } from '../../../../shared/infrastructure/http/interfaces/authenticated-request.interface.js';

@ApiTags('Auth - Autenticación y Sesiones')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly getProfile: GetProfileUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly resetPasswordWithToken: ResetPasswordWithTokenUseCase,
  ) {}

  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Valida credenciales y devuelve tokens JWT. Protegido con Rate Limiting (máximo 5 intentos por minuto).',
  })
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttlSeconds: 60, trackByBodyField: 'email' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginUser(@Body() dto: LoginDto) {
    return this.login.execute({
      email: dto.email,
      passwordRaw: dto.password,
    });
  }

  @ApiOperation({
    summary: 'Refrescar token',
    description: 'Rota el refresh token y devuelve nuevos tokens.',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.refreshToken.execute({
      refreshToken: dto.refreshToken,
    });
  }

  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña (Self-Service)',
    description:
      'Envía un enlace/token temporal de recuperación al correo del usuario. Protegido contra ataques de enumeración y fuerza bruta (Rate Limit: 3 req/min).',
  })
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 3, ttlSeconds: 60, trackByBodyField: 'email' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async requestForgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPassword.execute({
      email: dto.email,
    });
  }

  @ApiOperation({
    summary: 'Restablecer contraseña con token (Self-Service)',
    description:
      'Valida el token de recuperación temporal de un solo uso y actualiza la contraseña del usuario, revocando todas sus sesiones activas.',
  })
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async executeResetPassword(@Body() dto: ResetPasswordWithTokenDto) {
    return this.resetPasswordWithToken.execute({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }

  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Invalida la sesión actual en Redis revocando el token activo.',
  })
  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: AuthenticatedRequest) {
    await this.logoutUseCase.execute({
      userId: req.user.userId ?? req.user.sub,
      sessionId: req.user.jti,
    });
    return { message: 'Sesión cerrada exitosamente' };
  }

  @ApiOperation({
    summary: 'Obtener perfil actual',
    description: 'Devuelve los datos del usuario autenticado.',
  })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.getProfile.execute(
      req.user.userId ?? req.user.sub,
      req.user.tenantId,
      req.user.role,
      req.user.branchId,
    );
  }
}
