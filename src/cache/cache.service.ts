import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get(key: string): Promise<any> {
    const value = await this.cacheManager.get(key);
    if (value) {
      this.logger.log(`CACHE HIT for key: ${key}`);
    } else {
      this.logger.log(`CACHE MISS for key: ${key}`);
    }
    return value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.logger.log(`CACHE SET for key: ${key}${ttl ? ` (TTL: ${ttl}s)` : ''}`);
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    this.logger.log(`CACHE DEL for key: ${key}`);
    await this.cacheManager.del(key);
  }

  async getOrSet(
    key: string,
    fetchFn: () => Promise<any>,
    ttl?: number,
  ): Promise<any> {
    let value = await this.get(key);
    if (!value) {
      this.logger.log(`Fetching fresh data for key: ${key}`);
      value = await fetchFn();
      if (value) {
        await this.set(key, value, ttl);
      }
    }
    return value;
  }

  async delPattern(pattern: string): Promise<void> {
    this.logger.log(`CACHE DEL PATTERN: ${pattern}`);

    const store = (this.cacheManager as any).store;

    if (store.keys) {
      try {
        const keys = await store.keys(pattern);
        for (const key of keys) {
          await this.del(key);
        }
        this.logger.log(
          `Deleted ${keys.length} keys matching pattern: ${pattern}`,
        );
      } catch (error) {
        this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
      }
    } else {
      this.logger.warn(
        `Store doesn't support pattern deletion. Pattern ${pattern} not deleted.`,
      );
    }
  }
}
