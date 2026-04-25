import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common/services/logger.service';
import { CacheHeaderInterceptor } from './common/interceptors/cache.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NextFunction } from 'express';
import { NoSqlInjectionGuard } from './common/guards/nosql-injection.guard';
import  cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Request, Response } from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isStaging = process.env.NODE_ENV === 'staging';

  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.getHttpAdapter().getInstance().set('trust proxy', 'uniquelocal');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://dev-agripulse.netlify.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Cache-Control',
      'Pragma',
      'If-Modified-Since',
      'If-None-Match',
      'X-Timezone',
      'X-Timezone-Offset',
    ],
    exposedHeaders: [
      'Authorization',
      'X-Total-Count',
      'X-Pagination-Count',
      'X-Pagination-Page',
      'X-Pagination-Limit',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  app.setGlobalPrefix('api/v1');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  });

  app.use(cookieParser());


  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new CacheHeaderInterceptor(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },

      forbidUnknownValues: false,

      skipMissingProperties: true,

      skipNullProperties: true,

      skipUndefinedProperties: true,

      validationError: {
        target: false,
        value: false,
      },

      exceptionFactory: (errors) => {
        console.warn('Validation warnings:', {
          timestamp: new Date().toISOString(),
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
            value: error.value,
          })),
        });

        const sanitizedErrors = errors.map((error) => {
          const constraints = error.constraints || {};
          const messages = Object.values(constraints).map((msg) => {
            return msg.replace(/^(?!\s*).*class-validator:/i, '').trim();
          });

          return {
            property: error.property,
            messages: messages.length > 0 ? messages : ['Invalid value'],
          };
        });

        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed. Please check your request.',
          errors: sanitizedErrors,
          timestamp: new Date().toISOString(),
          path: 'complementary-tickets',
        });
      },
    }),
  );

  app.useGlobalGuards(new NoSqlInjectionGuard());

  app.useGlobalFilters(new HttpExceptionFilter());

  if (isDevelopment || isStaging) {
    const config = new DocumentBuilder()
      .setTitle('AgriPulse API')
      .setDescription('API documentation for AgriPulse')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api/docs', app as any, document);

    Logger.log('Swagger documentation available at /api/docs', 'Bootstrap');
  }

  await app.listen(process.env.PORT ?? 8000, '0.0.0.0', () => {
    Logger.log(`Server is running on port ${process.env.PORT ?? 8000}`);
  });
}

bootstrap();
