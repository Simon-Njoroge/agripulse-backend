import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class CacheHeaderInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheHeaderInterceptor.name);
  private readonly cacheThreshold = 15;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const isGetRequest = request.method === 'GET';

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;

        let cacheStatus = 'MISS';

        if (isGetRequest) {
          cacheStatus = responseTime < this.cacheThreshold ? 'HIT' : 'MISS';
        } else {
          cacheStatus = 'N/A';
        }

        response.setHeader('X-Cache-Status', cacheStatus);
        response.setHeader('X-Response-Time', `${responseTime}ms`);
        response.setHeader('X-Request-Method', request.method);
        response.setHeader('X-Request-Path', request.url);
        response.setHeader('X-Cache-Timestamp', new Date().toISOString());

        if (isGetRequest) {
          const logMessage = `${request.method} ${request.url} - Cache: ${cacheStatus} - ${responseTime}ms`;

          if (cacheStatus === 'HIT') {
            this.logger.log(`${logMessage}`);
          } else {
            this.logger.log(`${logMessage}`);
          }
        } else {
          this.logger.log(
            `${request.method} ${request.url} - ${responseTime}ms`,
          );
        }
      }),
    );
  }
}
