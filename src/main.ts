import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { DomainExceptionFilter } from './shared/infrastructure/http/filters/domain-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── Global Filters ──────────────────────────────────────────────────────
  // Traduce DomainException → respuestas HTTP con código y mensaje apropiados
  app.useGlobalFilters(new DomainExceptionFilter());

  // ─── Validation ──────────────────────────────────────────────────────────
  // - whitelist: elimina propiedades no declaradas en el DTO
  // - forbidNonWhitelisted: rechaza con 400 si llegan campos no permitidos
  // - transform: convierte el payload JSON a instancias de DTO tipadas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ─── CORS ────────────────────────────────────────────────────────────────
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : '*';

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ─── Swagger ─────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('API SaaS Contable')
    .setDescription('Core Architecture — Multi-Tenancy, RLS y RBAC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ─── Start ───────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Servidor iniciado en el puerto ${port}`);
  logger.log(`Swagger disponible en http://localhost:${port}/api/docs`);
}

await bootstrap();
