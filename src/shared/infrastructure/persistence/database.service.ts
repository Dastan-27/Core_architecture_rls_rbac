import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.verifyConnection();
    await this.ensureSchemaConstraints();
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

  async ensureSchemaConstraints(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_users_document_number ON users (document_number);
      `);
      this.logger.log(
        'Restricción única de documento (uq_users_document_number) verificada en BD',
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo sincronizar uq_users_document_number: ${(error as Error).message}`,
      );
    }
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
