import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<TypeOrmModuleOptions> => {
        const logger = new Logger('DatabaseModule');

        try {
          const config: TypeOrmModuleOptions = {
            type: 'postgres',
            host: configService.getOrThrow<string>('DB_HOST'),
            port: configService.getOrThrow<number>('DB_PORT'),
            username: configService.getOrThrow<string>('DB_USERNAME'),
            password: configService.getOrThrow<string>('DB_PASSWORD'),
            database: configService.getOrThrow<string>('DB_DATABASE'),
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: configService.get<boolean>('DB_SYNC', true),
            logging: configService.get<boolean>('DB_LOGGING', false),
            ssl: {
              rejectUnauthorized: false,
            },
          };
          logger.log('Successfully loaded database config');

          return config;
        } catch (error) {
          logger.error(
            'Failed to load database config or connect to the database',
            error,
          );
          throw error;
        }
      },
    }),
  ],
})
export class DatabaseModule {}
