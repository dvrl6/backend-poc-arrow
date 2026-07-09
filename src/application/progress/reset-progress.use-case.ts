import { Inject, Injectable } from '@nestjs/common';
import { ProgressRepository } from '../ports/progress.repository';
import { PROGRESS_REPOSITORY } from '../tokens';

@Injectable()
export class ResetProgressUseCase {
  constructor(@Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository) {}

  async execute(userId: string): Promise<void> {
    await this.progress.deleteByUserId(userId);
  }
}
