import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponse = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  errorCode: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = this.resolveMessage(exceptionResponse, exception);
    const errorCode = this.resolveErrorCode(statusCode, exceptionResponse);

    const body: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errorCode,
    };

    response.status(statusCode).json(body);
  }

  private resolveMessage(
    exceptionResponse: string | object | null,
    exception: unknown,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      'message' in exceptionResponse &&
      (typeof exceptionResponse.message === 'string' ||
        Array.isArray(exceptionResponse.message))
    ) {
      return exceptionResponse.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unexpected server error';
  }

  private resolveErrorCode(
    statusCode: number,
    exceptionResponse: string | object | null,
  ): string {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'error' in exceptionResponse &&
      typeof exceptionResponse.error === 'string'
    ) {
      return exceptionResponse.error.toUpperCase().replaceAll(' ', '_');
    }

    return `HTTP_${statusCode}`;
  }
}
