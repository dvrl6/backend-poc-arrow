import { PlayerProgressEntity } from '../../domain/progress/player-progress.entity';

export type SyncProgressData = {
  userId: string;
  levelId: string;
  completed: boolean;
  bestScore: number | null;
  bestMoves: number | null;
  bestTimeSeconds: number | null;
};

export interface ProgressRepository {
  findByUserId(userId: string): Promise<PlayerProgressEntity[]>;
  upsert(data: SyncProgressData): Promise<PlayerProgressEntity>;
  deleteByUserId(userId: string): Promise<void>;
}
