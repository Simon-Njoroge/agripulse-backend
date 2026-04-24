import { Global, Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisConfig = {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        };

        if (redisConfig.host) {
          try {
            logger.log('Using Redis cache');
            return {
              store: require('cache-manager-redis-store'),
              ...redisConfig,
              ttl: 60000,
              max: 1000,
              isGlobal: true,
            };
          } catch (error) {
            logger.warn(
              'Redis connection failed, falling back to memory cache',
            );
          }
        }

        logger.log('Using memory cache');
        return {
          ttl: 60000,
          max: 1000,
          isGlobal: true,
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class GlobalCacheModule {}
