import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'RATE_LIMIT_OPTIONS';

export interface RateLimitOptions {
  /**
   * Cantidad máxima de solicitudes permitidas en la ventana de tiempo.
   */
  readonly limit: number;

  /**
   * Duración de la ventana de tiempo en segundos.
   */
  readonly ttlSeconds: number;

  /**
   * Prefijo de clave en Redis (opcional). Por defecto: 'rl'.
   */
  readonly keyPrefix?: string;

  /**
   * Si es true, combina la IP con el identificador del cuerpo (ej. email) para granularidad por usuario/ip.
   */
  readonly trackByBodyField?: string;
}

/**
 * Decorador para aplicar rate limiting basado en Redis a rutas o controladores.
 *
 * @example
 * @RateLimit({ limit: 5, ttlSeconds: 60, trackByBodyField: 'email' })
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
