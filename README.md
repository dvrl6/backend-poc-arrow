# Nodus Backend

REST API for the Nodus client. Server-side context only — see `frontend-poc-arrow` for the client.

## What it does

Handles user authentication, the level catalog, progress persistence/sync, and leaderboards for the Nodus Flutter client. The backend stores and serves data; it does not run gameplay logic.

## Tech stack

- Node.js, TypeScript
- NestJS 11 (`@nestjs/*`, `@nestjs/jwt`) — Express under the hood, not a bare Express app
- Prisma 6 + PostgreSQL
- JWT authentication

Layered / ports-and-adapters architecture: domain rules are framework-free, application defines ports (interfaces) that infrastructure adapters implement, and interfaces (HTTP controllers) are the only entry point.

## Architecture

```text
src/
  domain/            entities, value objects, pure rules
  application/
    ports/            interfaces implemented by infrastructure
    <feature>/         use cases
  infrastructure/
    database/          Prisma client/module
    repositories/       port implementations
    security/            hashing, JWT signing
  interfaces/
    http/
      <feature>/
        <feature>.controller.ts
        dto/
      filters/
      interceptors/
      health/
  modules/            NestJS module wiring
prisma/
  schema.prisma
  migrations/
  levels/             manual-levels.ts (seed data)
  seed.ts
test/
```

## Key endpoints

| Method | Path                   | Auth | Description                      |
|--------|------------------------|------|-----------------------------------|
| POST   | `/auth/register`       | No   | Create a new user account         |
| POST   | `/auth/login`          | No   | Authenticate and receive a JWT    |
| GET    | `/levels`              | No   | List the level catalog            |
| GET    | `/progress/me`         | Yes  | Get the authenticated user's progress |
| POST   | `/progress/sync`       | Yes  | Sync client progress to the server |
| DELETE | `/progress`            | Yes  | Delete the authenticated user's progress |
| GET    | `/leaderboard/:levelId`| No   | Get leaderboard entries for a level |
| POST   | `/leaderboard`         | Yes  | Submit a leaderboard score         |

## Setup

```powershell
npm install
docker compose up          # Postgres 17 + API
npx prisma migrate dev     # or: npm run prisma:migrate
npm run prisma:seed
```

## Run

```powershell
npm run start:dev   # watch mode
npm test
npm run test:e2e
```

There is no `npm run dev` — the dev script is `start:dev`.

## Environment variables

`.env` template:

```text
PORT=3000
DATABASE_URL=
JWT_SECRET=
CORS_ORIGIN=
NODE_ENV=development
DATABASE_URL_TEST=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

## Seed data

`prisma/levels/manual-levels.ts` seeds the anchor level rows (stable `levelId`s the client maps to) via `prisma/seed.ts`.
