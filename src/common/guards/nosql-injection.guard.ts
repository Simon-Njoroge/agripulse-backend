import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class NoSqlInjectionGuard implements CanActivate {
  private mongoOperators = [
    '$eq',
    '$ne',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$in',
    '$nin',
    '$exists',
    '$type',
    '$not',
    '$regex',
    '$or',
    '$and',
    '$nor',
    '$all',
    '$elemMatch',
    '$size',
    '$mod',
    '$where',
    '$text',
    '$search',
    '$language',
    '$caseSensitive',
    '$diacriticSensitive',
  ];

  private dangerousPatterns = [
    { pattern: /\$where/i, message: 'NoSQL injection attempt detected' },
    { pattern: /\$function/i, message: 'NoSQL injection attempt detected' },
    { pattern: /\$accumulator/i, message: 'NoSQL injection attempt detected' },
    { pattern: /\$map/i, message: 'NoSQL injection attempt detected' },
    {
      pattern: /\.(?:find|update|delete|remove|aggregate|distinct)\(/i,
      message: 'Potential NoSQL injection',
    },
    { pattern: /javascript:/i, message: 'JavaScript injection detected' },
    { pattern: /eval\s*\(/i, message: 'Eval injection detected' },
    { pattern: /fromCharCode/i, message: 'Character code injection detected' },
  ];

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    this.checkRequest(request);

    return true;
  }

  private checkRequest(request: any): void {
    if (request.query) {
      this.checkObject(request.query, 'query parameters');
    }

    if (request.body && typeof request.body === 'object') {
      this.checkObject(request.body, 'request body');
    }

    if (request.params) {
      this.checkObject(request.params, 'URL parameters');
    }

    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          this.checkString(value, `header "${key}"`);
        }
      }
    }

    if (request.cookies) {
      this.checkObject(request.cookies, 'cookies');
    }
  }

  private checkObject(obj: any, context: string): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      this.checkKey(key, context);

      const value = obj[key];
      if (typeof value === 'string') {
        this.checkString(value, `${context} value for key "${key}"`);
      } else if (typeof value === 'object' && value !== null) {
        this.checkObject(value, `${context} for key "${key}"`);
      } else if (Array.isArray(value)) {
        this.checkArray(value, `${context} array for key "${key}"`);
      }
    }
  }

  private checkArray(arr: any[], context: string): void {
    for (const item of arr) {
      if (typeof item === 'string') {
        this.checkString(item, `${context} array item`);
      } else if (typeof item === 'object' && item !== null) {
        this.checkObject(item, `${context} array item`);
      }
    }
  }

  private checkKey(key: string, context: string): void {
    const keyLower = key.toLowerCase();

    for (const operator of this.mongoOperators) {
      if (keyLower.startsWith(operator.toLowerCase())) {
        throw new BadRequestException(
          `Invalid ${context}: contains MongoDB operator "${key}"`,
        );
      }
    }

    if (
      key.includes('.') &&
      key.split('.').some((part) => {
        const partLower = part.toLowerCase();
        return this.mongoOperators.some((op) => partLower === op.toLowerCase());
      })
    ) {
      throw new BadRequestException(
        `Invalid ${context}: contains potentially dangerous key "${key}"`,
      );
    }
  }

  private checkString(value: string, context: string): void {
    const valueLower = value.toLowerCase();

    for (const operator of this.mongoOperators) {
      if (valueLower.includes(operator.toLowerCase())) {
        throw new BadRequestException(
          `Invalid ${context}: contains MongoDB operator "${value}"`,
        );
      }
    }

    for (const { pattern, message } of this.dangerousPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException(`${message} in ${context}`);
      }
    }

    const suspiciousPatterns = [
      {
        pattern: /["']\s*\+\s*["']/i,
        message: 'String concatenation pattern detected',
      },
      {
        pattern: /\\u[0-9a-fA-F]{4}/g,
        message: 'Unicode escape sequences detected',
      },
      {
        pattern: /\\x[0-9a-fA-F]{2}/g,
        message: 'Hex escape sequences detected',
      },
      { pattern: /\.constructor/i, message: 'Constructor access detected' },
      { pattern: /__proto__/i, message: '__proto__ access detected' },
      { pattern: /prototype/i, message: 'Prototype access detected' },
    ];

    for (const { pattern, message } of suspiciousPatterns) {
      if (pattern.test(value)) {
        console.warn(`Suspicious pattern in ${context}: ${message}`);
      }
    }
  }
}
