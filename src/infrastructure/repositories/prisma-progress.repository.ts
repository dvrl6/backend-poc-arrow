import { Injectable } from '@nestjs/common';
import { PlayerProgress } from '@prisma/client';
import {
  ProgressRepository,
  SyncProgressData,
} from '../../application/ports/progress.repository';
import { PlayerProgressEntity } from '../../domain/progress/player-progress.entity';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PlayerProgressEntity[]> {
    const progress = await this.prisma.playerProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return progress.map((item) => this.mapProgress(item));
  }

  async upsert(data: SyncProgressData): Promise<PlayerProgressEntity> {
    const progress = await this.prisma.playerProgress.upsert({
      where: {
        userId_levelId: {
          userId: data.userId,
          levelId: data.levelId,
        },
      },
      update: {
        completed: data.completed,
        bestScore: data.bestScore,
        bestMoves: data.bestMoves,
        bestTimeSeconds: data.bestTimeSeconds,
      },
      create: data,
    });

    return this.mapProgress(progress);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.playerProgress.deleteMany({ where: { userId } });
  }

  private mapProgress(progress: PlayerProgress): PlayerProgressEntity {
    return {
      id: progress.id,
      userId: progress.userId,
      levelId: progress.levelId,
      completed: progress.completed,
      bestScore: progress.bestScore,
      bestMoves: progress.bestMoves,
      bestTimeSeconds: progress.bestTimeSeconds,
      updatedAt: progress.updatedAt,
    };
  }
}
