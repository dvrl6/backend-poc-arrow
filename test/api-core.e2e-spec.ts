import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LoginUserUseCase } from '../src/application/auth/login-user.use-case';
import { RegisterUserUseCase } from '../src/application/auth/register-user.use-case';
import { CreateLevelUseCase } from '../src/application/levels/create-level.use-case';
import {
  GetLevelByIdUseCase,
  GetLevelsUseCase,
} from '../src/application/levels/get-levels.use-case';
import { UpdateLevelUseCase } from '../src/application/levels/update-level.use-case';
import { GetLeaderboardUseCase } from '../src/application/leaderboard/get-leaderboard.use-case';
import { SubmitLeaderboardScoreUseCase } from '../src/application/leaderboard/submit-leaderboard-score.use-case';
import { GetMyProgressUseCase } from '../src/application/progress/get-my-progress.use-case';
import { ResetProgressUseCase } from '../src/application/progress/reset-progress.use-case';
import { SyncProgressUseCase } from '../src/application/progress/sync-progress.use-case';
import { LevelRepository, SaveLevelData } from '../src/application/ports/level.repository';
import {
  LeaderboardRepository,
  SubmitLeaderboardScoreData,
} from '../src/application/ports/leaderboard.repository';
import {
  ProgressRepository,
  SyncProgressData,
} from '../src/application/ports/progress.repository';
import { CreateUserData, UserRepository } from '../src/application/ports/user.repository';
import {
  LEADERBOARD_REPOSITORY,
  LEVEL_REPOSITORY,
  PASSWORD_HASHER,
  PROGRESS_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../src/application/tokens';
import { GraphLevelDefinition } from '../src/domain/levels/graph-level-definition';
import { LevelEntity } from '../src/domain/levels/level.entity';
import { LeaderboardEntryEntity } from '../src/domain/leaderboard/leaderboard-entry.entity';
import { PlayerProgressEntity } from '../src/domain/progress/player-progress.entity';
import { UserEntity } from '../src/domain/users/user.entity';
import { UserRole } from '../src/domain/users/user-role';
import { BcryptPasswordHasher } from '../src/infrastructure/security/bcrypt-password-hasher';
import { JwtTokenService } from '../src/infrastructure/security/jwt-token.service';
import { AuthController } from '../src/interfaces/http/auth/auth.controller';
import { JwtAuthGuard } from '../src/interfaces/http/auth/jwt-auth.guard';
import { RolesGuard } from '../src/interfaces/http/auth/roles.guard';
import { HttpExceptionFilter } from '../src/interfaces/http/filters/http-exception.filter';
import { LeaderboardController } from '../src/interfaces/http/leaderboard/leaderboard.controller';
import { LevelsController } from '../src/interfaces/http/levels/levels.controller';
import { LoggingPerformanceInterceptor } from '../src/interfaces/http/interceptors/logging-performance.interceptor';
import { ProgressController } from '../src/interfaces/http/progress/progress.controller';

const validDefinition: GraphLevelDefinition = {
  nodes: [],
  edges: [],
  arrows: [],
  blockedEdges: [],
  metadata: {},
};

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserEntity>();

  async create(data: CreateUserData): Promise<UserEntity> {
    const user: UserEntity = {
      id: `user-${this.users.size + 1}`,
      email: data.email,
      displayName: data.displayName,
      passwordHash: data.passwordHash,
      role: data.role ?? UserRole.PLAYER,
    };
    this.users.set(user.email, user);
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.get(email) ?? null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return [...this.users.values()].find((user) => user.id === id) ?? null;
  }
}

class InMemoryLevelRepository implements LevelRepository {
  private readonly levels = new Map<string, LevelEntity>([
    [
      'level-1',
      {
        id: 'level-1',
        number: 1,
        name: 'Seeded Level',
        difficulty: 'easy',
        generationType: 'manual',
        seed: null,
        definitionJson: validDefinition,
      },
    ],
  ]);

  async create(data: SaveLevelData): Promise<LevelEntity> {
    const level = this.mapData(`level-${this.levels.size + 1}`, data);
    this.levels.set(level.id, level);
    return level;
  }

  async findAll(): Promise<LevelEntity[]> {
    return [...this.levels.values()].sort((a, b) => a.number - b.number);
  }

  async findById(id: string): Promise<LevelEntity | null> {
    return this.levels.get(id) ?? null;
  }

  async findByNumber(number: number): Promise<LevelEntity | null> {
    return [...this.levels.values()].find((level) => level.number === number) ?? null;
  }

  async update(id: string, data: SaveLevelData): Promise<LevelEntity> {
    const level = this.mapData(id, data);
    this.levels.set(id, level);
    return level;
  }

  private mapData(id: string, data: SaveLevelData): LevelEntity {
    return {
      id,
      number: data.number,
      name: data.name,
      difficulty: data.difficulty,
      generationType: data.generationType,
      seed: data.seed,
      definitionJson: data.definitionJson as GraphLevelDefinition,
    };
  }
}

class InMemoryProgressRepository implements ProgressRepository {
  private readonly progress = new Map<string, PlayerProgressEntity>();

  async findByUserId(userId: string): Promise<PlayerProgressEntity[]> {
    return [...this.progress.values()].filter((item) => item.userId === userId);
  }

  async upsert(data: SyncProgressData): Promise<PlayerProgressEntity> {
    const key = `${data.userId}:${data.levelId}`;
    const item: PlayerProgressEntity = {
      id: this.progress.get(key)?.id ?? `progress-${this.progress.size + 1}`,
      ...data,
    };
    this.progress.set(key, item);
    return item;
  }

  async deleteByUserId(userId: string): Promise<void> {
    for (const [key, item] of this.progress.entries()) {
      if (item.userId === userId) {
        this.progress.delete(key);
      }
    }
  }
}

class InMemoryLeaderboardRepository implements LeaderboardRepository {
  private readonly entries = new Map<string, LeaderboardEntryEntity>();

  async findByUserAndLevel(
    userId: string,
    levelId: string,
  ): Promise<LeaderboardEntryEntity | null> {
    return this.entries.get(`${userId}:${levelId}`) ?? null;
  }

  async getForLevel(levelId: string, limit: number): Promise<LeaderboardEntryEntity[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.levelId === levelId)
      .sort((a, b) => b.score - a.score || a.moves - b.moves || a.timeSeconds - b.timeSeconds)
      .slice(0, limit);
  }

  async upsertBestScore(data: SubmitLeaderboardScoreData): Promise<LeaderboardEntryEntity> {
    const key = `${data.userId}:${data.levelId}`;
    const entry: LeaderboardEntryEntity = {
      id: this.entries.get(key)?.id ?? `leaderboard-${this.entries.size + 1}`,
      ...data,
    };
    this.entries.set(key, entry);
    return entry;
  }
}

describe('API core', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let playerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, LevelsController, ProgressController, LeaderboardController],
      providers: [
        RegisterUserUseCase,
        LoginUserUseCase,
        GetLevelsUseCase,
        GetLevelByIdUseCase,
        CreateLevelUseCase,
        UpdateLevelUseCase,
        GetMyProgressUseCase,
        SyncProgressUseCase,
        ResetProgressUseCase,
        GetLeaderboardUseCase,
        SubmitLeaderboardScoreUseCase,
        JwtAuthGuard,
        RolesGuard,
        JwtTokenService,
        {
          provide: USER_REPOSITORY,
          useClass: InMemoryUserRepository,
        },
        {
          provide: LEVEL_REPOSITORY,
          useClass: InMemoryLevelRepository,
        },
        {
          provide: PROGRESS_REPOSITORY,
          useClass: InMemoryProgressRepository,
        },
        {
          provide: LEADERBOARD_REPOSITORY,
          useClass: InMemoryLeaderboardRepository,
        },
        {
          provide: PASSWORD_HASHER,
          useClass: BcryptPasswordHasher,
        },
        {
          provide: TOKEN_SERVICE,
          useClass: JwtTokenService,
        },
      ],
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

    jwtService = moduleFixture.get(JwtService);
    playerToken = await jwtService.signAsync({
      sub: 'player-1',
      email: 'player@example.com',
      role: UserRole.PLAYER,
    });
    adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_jwt_token_when_user_registers', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'new@example.com',
        displayName: 'New Player',
        password: 'StrongPass123',
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.role).toBe(UserRole.PLAYER);
  });

  it('should_reject_protected_route_when_token_is_missing', async () => {
    await request(app.getHttpServer()).get('/progress/me').expect(401);
  });

  it('should_forbid_level_creation_when_user_is_not_admin', async () => {
    await request(app.getHttpServer())
      .post('/levels')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        number: 2,
        name: 'Player Level',
        difficulty: 'easy',
        generationType: 'manual',
        seed: null,
        definitionJson: validDefinition,
      })
      .expect(403);
  });

  it('should_create_level_when_user_is_admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        number: 2,
        name: 'Admin Level',
        difficulty: 'easy',
        generationType: 'manual',
        seed: null,
        definitionJson: validDefinition,
      })
      .expect(201);

    expect(response.body.name).toBe('Admin Level');
  });

  it('should_reject_level_when_graph_shape_is_invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        number: 3,
        name: 'Invalid Level',
        difficulty: 'easy',
        generationType: 'manual',
        seed: null,
        definitionJson: {
          nodes: [],
        },
      })
      .expect(400);

    expect(response.body.errorCode).toBe('BAD_REQUEST');
  });

  it('should_sync_progress_when_user_is_authenticated', async () => {
    const response = await request(app.getHttpServer())
      .post('/progress/sync')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        levelId: 'level-1',
        completed: true,
        bestScore: 900,
        bestMoves: 10,
        bestTimeSeconds: 50,
      })
      .expect(201);

    expect(response.body.completed).toBe(true);
  });

  it('should_delete_progress_when_user_is_authenticated', async () => {
    await request(app.getHttpServer())
      .post('/progress/sync')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        levelId: 'level-reset',
        completed: true,
        bestScore: 500,
        bestMoves: 20,
        bestTimeSeconds: 90,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/progress')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(204);

    const response = await request(app.getHttpServer())
      .get('/progress/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('should_reject_progress_reset_when_unauthenticated', async () => {
    await request(app.getHttpServer()).delete('/progress').expect(401);
  });

  it('should_return_leaderboard_for_level', async () => {
    await request(app.getHttpServer())
      .post('/leaderboard')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        levelId: 'level-1',
        score: 1000,
        moves: 10,
        timeSeconds: 60,
      })
      .expect(201);

    const response = await request(app.getHttpServer()).get('/leaderboard/level-1').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].score).toBe(1000);
  });
});
