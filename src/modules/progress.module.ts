import { Module } from '@nestjs/common';
import { GetMyProgressUseCase } from '../application/progress/get-my-progress.use-case';
import { ResetProgressUseCase } from '../application/progress/reset-progress.use-case';
import { SyncProgressUseCase } from '../application/progress/sync-progress.use-case';
import { PROGRESS_REPOSITORY } from '../application/tokens';
import { PrismaModule } from '../infrastructure/database/prisma.module';
import { PrismaProgressRepository } from '../infrastructure/repositories/prisma-progress.repository';
import { ProgressController } from '../interfaces/http/progress/progress.controller';
import { AuthModule } from './auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProgressController],
  providers: [
    GetMyProgressUseCase,
    SyncProgressUseCase,
    ResetProgressUseCase,
    {
      provide: PROGRESS_REPOSITORY,
      useClass: PrismaProgressRepository,
    },
  ],
})
export class ProgressModule {}
