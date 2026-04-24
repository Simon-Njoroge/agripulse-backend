import { CacheService } from './cache.service';

export abstract class CachedBaseService {
  constructor(
    protected cacheService: CacheService,
    protected entityName: string,
  ) {}

  async findCached(id: string, ttl: number = 3600): Promise<any> {
    const cacheKey = `${this.entityName}_${id}`;
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.findFromSource(id),
      ttl,
    );
  }

  async cacheList(
    key: string,
    findFn: () => Promise<any>,
    ttl: number = 1800,
  ): Promise<any> {
    return await this.cacheService.getOrSet(key, findFn, ttl);
  }

  async cacheCustom(
    key: string,
    findFn: () => Promise<any>,
    ttl: number = 1800,
  ): Promise<any> {
    return await this.cacheService.getOrSet(key, findFn, ttl);
  }

  async invalidateById(id: string): Promise<void> {
    const cacheKey = `${this.entityName}_${id}`;
    await this.cacheService.del(cacheKey);
  }

  async invalidateList(): Promise<void> {
    await this.cacheService.del(`${this.entityName}_list`);
  }

  async invalidateAll(): Promise<void> {
    await this.invalidateList();
  }

  protected abstract findFromSource(id: string): Promise<any>;
}
