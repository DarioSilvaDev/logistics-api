import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId =
      request.headers['x-request-id']?.toString() ?? randomUUID();
    const start = Date.now();

    request.requestId = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `[${requestId}] ${request.method} ${request.url} ${response.statusCode} ${Date.now() - start}ms`,
          );
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Unhandled request error';
          this.logger.error(
            `[${requestId}] ${request.method} ${request.url} ${response.statusCode} ${Date.now() - start}ms ${message}`,
          );
        },
      }),
    );
  }
}
