import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainException } from '../../../domain/domain.exception.js';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.warn(
      `[${exception.code}] ${exception.message}`,
    );

    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      error: exception.code,
      message: exception.message,
    });
  }
}
