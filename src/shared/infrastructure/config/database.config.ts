import { registerAs } from '@nestjs/config';

export const DATABASE_CONFIG_KEY = 'database';

export interface DatabaseConfig {
  readonly url?: string;
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly database?: string;
  readonly ssl: boolean;
  readonly sslCa?: string;
  readonly sslCaPath?: string;
  readonly synchronize: boolean;
  readonly isProduction: boolean;
}

export default registerAs(
  DATABASE_CONFIG_KEY,
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === 'true',
    sslCa: process.env.DB_SSL_CA,
    sslCaPath: process.env.DB_SSL_CA_PATH,
    synchronize:
      process.env.DB_SYNCHRONIZE === 'true' &&
      process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
  }),
);
