import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.verifyConnection();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('Conexión a la base de datos establecida correctamente');
      return true;
    } catch (error) {
      this.logger.error(
        'Fallo al conectar a la base de datos',
        (error as Error).stack,
      );
      throw error;
    }
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
