import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import databaseConfig from './database.config.js';
import redisConfig from './redis.config.js';
import { validateEnvironment } from './env.validation.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnvironment,
      load: [databaseConfig, redisConfig],
    }),
  ],
})
export class AppConfigModule {}
