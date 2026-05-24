# Arrow POC Backend

NestJS REST API for the Arrow Maze inspired semester project.

## Current Phase

Phase 1 bootstrap only:

- NestJS application shell.
- PostgreSQL Docker Compose service.
- Prisma schema foundation.
- Health endpoint.
- Global validation pipe.
- Consistent HTTP error filter shell.
- Logging/performance interceptor shell.
- Swagger at `/api/docs`.

Business modules such as auth, users, levels, progress sync, and leaderboard will be implemented in later phases.

## Architecture Direction

The backend will follow Clean Architecture:

- `domain`: pure business entities and value objects.
- `application`: use cases and repository ports.
- `infrastructure`: Prisma, JWT, hashing, config, and external adapters.
- `interfaces`: NestJS controllers, DTOs, guards, filters, and interceptors.

The Flutter application owns gameplay logic. This backend will store users, graph-based level definitions, progress, and leaderboard data; it will not process every move.

## Local Setup

Create a local `.env` from `.env.example` when needed.

```powershell
npm install
npm run build
npm run test
docker compose up --build
```

Health check:

```text
GET http://localhost:3000/health
```

Swagger:

```text
http://localhost:3000/api/docs
```

## Environment Variables

- `PORT`: API port. Default: `3000`.
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: JWT signing secret for later auth implementation.
- `CORS_ORIGIN`: allowed frontend origin.
- `NODE_ENV`: runtime environment.

## Git Checklist Before First Push

Do not change Git remotes automatically. Before the first push, manually verify/fix the remotes because the initial inspection showed `origin/main [gone]`:

```powershell
git remote -v
git status --short --branch
```

## Documentation To Complete Later

- Full API endpoint table.
- Clean Architecture diagram.
- Class/domain diagram.
- SOLID examples with links to code.
- GoF design pattern examples.
- AOP documentation.
- Prisma migration and seed instructions for the 15 manual graph-based levels.
- Testing strategy and CI badges.

## Commit Convention

Use Conventional Commits in English, for example:

```text
feat(api): add health endpoint
docs(readme): document backend bootstrap
test(health): add health endpoint e2e test
```
