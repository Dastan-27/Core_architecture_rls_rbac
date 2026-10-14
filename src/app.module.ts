import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigModule } from './shared/infrastructure/config/config.module.js';
import { DatabaseModule } from './shared/infrastructure/persistence/database.module.js';
import { RlsModule } from './shared/infrastructure/persistence/rls/rls.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RlsModule,

    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'Core_architecture_rls_rbac',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

