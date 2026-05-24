import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/interfaces/http/filters/http-exception.filter';
import { LoggingPerformanceInterceptor } from '../src/interfaces/http/interceptors/logging-performance.interceptor';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingPerformanceInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_ok_status_when_health_endpoint_is_called', async () => {
    // Arrange & Act
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    // Assert
    expect(response.body).toMatchObject({
      status: 'ok',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.uptimeSeconds).toEqual(expect.any(Number));
  });
});
