import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './interfaces/http/filters/http-exception.filter';
import { LoggingPerformanceInterceptor } from './interfaces/http/interceptors/logging-performance.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingPerformanceInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Arrow POC API')
    .setDescription('REST API for users, graph-based levels, progress synchronization, and leaderboard.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/api/docs', app, swaggerDocument);

  const port = Number(configService.get<string>('PORT') ?? 3000);
  await app.listen(port);
}

void bootstrap();
