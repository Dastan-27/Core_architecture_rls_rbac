import * as fs from 'node:fs';
import * as path from 'node:path';

import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  TypeOrmModuleOptions,
  TypeOrmOptionsFactory,
} from '@nestjs/typeorm';

import databaseConfig from '../config/database.config.js';

@Injectable()
export class DatabaseOptionsFactory implements TypeOrmOptionsFactory {
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) { }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const baseOptions = this.buildBaseOptions();

    if (this.dbConfig.url) {
      return { ...baseOptions, url: this.dbConfig.url };
    }

    return {
      ...baseOptions,
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      username: this.dbConfig.username,
      password: this.dbConfig.password,
      database: this.dbConfig.database,
    } as TypeOrmModuleOptions;
  }

  // ─── Construcción de opciones base ───────────────────────────────

  private buildBaseOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      ssl: this.buildSslOptions(),
      autoLoadEntities: true,
      synchronize: this.dbConfig.synchronize,
      logging: this.dbConfig.isProduction
        ? (['error'] as const)
        : (['error', 'warn'] as const),
      extra: {
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        statement_timeout: 10_000,
      },
    };
  }

  private buildHostOptions() {
    return {
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      username: this.dbConfig.username,
      password: this.dbConfig.password,
      database: this.dbConfig.database,
    };
  }

  // ─── Configuración SSL ───────────────────────────────────────────

  private buildSslOptions(): boolean | Record<string, unknown> {
    if (!this.shouldUseSsl()) {
      return false;
    }

    const ca = this.loadCaCertificate();
    return ca
      ? { rejectUnauthorized: true, ca }
      : { rejectUnauthorized: false };
  }

  private shouldUseSsl(): boolean {
    return (
      this.dbConfig.ssl ||
      this.dbConfig.isProduction ||
      Boolean(this.dbConfig.url?.includes('render.com'))
    );
  }

  private loadCaCertificate(): string | undefined {
    if (this.dbConfig.sslCa) {
      return this.dbConfig.sslCa;
    }

    const caPath =
      this.dbConfig.sslCaPath ??
      path.resolve(process.cwd(), 'certs/isrgrootx1.pem');

    return fs.existsSync(caPath)
      ? fs.readFileSync(caPath, 'utf8')
      : undefined;
  }
}
