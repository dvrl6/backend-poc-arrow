# Nodus Backend

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-blue)

REST API for the **Nodus** puzzle game client. Server-side context only — see [`frontend-poc-arrow`](https://github.com/arjperez-dev/frontend-poc-arrow) for the Flutter app.

---

## Description

Nodus Backend provides the HTTP services that support the Nodus mobile game: user registration and authentication, a catalog of graph-based levels, player progress persistence and synchronisation, and per-level leaderboards. The backend stores and serves data; **it does not run gameplay logic** — that responsibility belongs entirely to the Flutter client.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js · TypeScript |
| Framework | NestJS 11 (`@nestjs/*`, `@nestjs/jwt`) — Express under the hood |
| ORM / DB | Prisma 6 · PostgreSQL 17 |
| Auth | JWT bearer tokens · bcryptjs password hashing |
| Docs | Swagger / OpenAPI (`@nestjs/swagger`) at `/api/docs` |
| Testing | Jest · Supertest |
| DevOps | Docker · Docker Compose |

---

## Architecture 

The project follows a **layered / ports-and-adapters (hexagonal)** architecture: domain rules are framework-free, the application layer defines ports (interfaces) that infrastructure adapters implement, and interfaces (HTTP controllers) are the only entry point.

```text
src/
  domain/            entities, value objects, pure rules (no framework imports)
  application/
    ports/            abstract interfaces implemented by infrastructure
    <feature>/        use cases (orchestrate domain + ports)
  infrastructure/
    database/         Prisma client / module
    repositories/     port implementations (Prisma adapters)
    security/         hashing (bcrypt), JWT signing
  interfaces/
    http/
      <feature>/
        <feature>.controller.ts
        dto/
      filters/        global exception filter
      interceptors/   logging & performance interceptor
      health/
  modules/            NestJS module wiring
prisma/
  schema.prisma
  migrations/
  levels/             manual-levels.ts (seed data)
  seed.ts
test/
```

---

### Class Diagram
![Class Diagram](./docs/backend_class_diagram.svg)

### Architecture Diagram
![ports-and-adapters](./docs/backend_clean_architecture.svg)

**[View diagrams in Lucidchart](https://lucid.app/lucidchart/91a6320b-13f7-4069-8927-291808d3df97/edit?viewport_loc=-3741%2C-3586%2C21029%2C11282%2Cp1&invitationId=inv_214f2076-e9ff-4c87-8d51-6b451a2b95e5)**

---

## SOLID Principles

The codebase is designed around the five SOLID principles. Below are concrete examples from the source code:

### S — Single Responsibility Principle

Each class has one reason to change.

- [`RegisterUserUseCase`](src/application/auth/register-user.use-case.ts) orchestrates only the registration flow (validate uniqueness → hash → persist → sign token). It does not handle HTTP parsing (that is the controller's job) nor database queries (that is the repository's job).
- [`LeaderboardScorePolicy`](src/domain/leaderboard/leaderboard-score.policy.ts) encapsulates only the comparison rule for determining if a candidate score is better than the current best. No persistence, no HTTP concerns.
- [`HttpExceptionFilter`](src/interfaces/http/filters/http-exception.filter.ts) has the sole responsibility of catching any exception thrown in the application and normalising it into a consistent JSON error response.

### O — Open/Closed Principle

Classes are open for extension but closed for modification.

- The scoring comparison logic lives in a standalone policy class (`LeaderboardScorePolicy`). If the ranking criteria change (e.g. add a `combo` tiebreaker), only the policy is edited — the use case, controller, and repository remain untouched.
- Adding a new feature (e.g. achievements) means adding new ports, use cases, and a NestJS module without modifying existing ones.

### L — Liskov Substitution Principle

Any implementation of a port can replace any other without breaking use cases.

- [`PrismaUserRepository`](src/infrastructure/repositories/prisma-user.repository.ts) implements the [`UserRepository`](src/application/ports/user.repository.ts) interface. In end-to-end tests, an in-memory repository is substituted seamlessly — the use cases never know the difference.

### I — Interface Segregation Principle

Ports are small and focused — no client is forced to implement methods it does not need.

- Four separate repository interfaces exist: `UserRepository`, `LevelRepository`, `ProgressRepository`, `LeaderboardRepository` — each with only the methods its consumers require.
- Two security ports exist: `PasswordHasher` (hash / compare) and `TokenService` (sign / verify), rather than a single "SecurityService" interface.

### D — Dependency Inversion Principle

High-level modules depend on abstractions, not on low-level modules.

- [`RegisterUserUseCase`](src/application/auth/register-user.use-case.ts) injects `UserRepository`, `PasswordHasher`, and `TokenService` via NestJS `@Inject()` tokens — it never imports Prisma, bcrypt, or `@nestjs/jwt` directly.
- The NestJS IoC container binds concrete implementations (e.g. `PrismaUserRepository`) to abstract tokens at module-wiring time in the `modules/` layer, keeping the application layer completely decoupled from infrastructure.

---

## Design Patterns (GoF)

| Pattern | Category | Where | Purpose |
|---|---|---|---|
| **Repository** | Structural (Adapter) | `application/ports/*.repository.ts` → `infrastructure/repositories/prisma-*.repository.ts` | Adapts the Prisma ORM to the abstract ports defined by the application layer, decoupling persistence from business logic. |
| **Strategy / Policy** | Behavioural | [`LeaderboardScorePolicy`](src/domain/leaderboard/leaderboard-score.policy.ts) | Encapsulates the best-score comparison algorithm (score → moves → time) so it can be swapped or extended independently of the use case. |
| **Singleton** | Creational | `PrismaService` (NestJS default scope) | NestJS registers `PrismaService` as a singleton, ensuring a single database connection pool across all repositories. |
| **Command** | Behavioural | `RegisterUserCommand`, `SubmitLeaderboardScoreData` | Input DTOs act as command objects, encapsulating all data required to execute a use case in a single immutable object. |
| **Chain of Responsibility** | Behavioural | NestJS middleware pipeline: Guards → Interceptors → Controller → Filters | Each concern (auth, logging, exception handling) is a link in the chain. Adding a new concern means adding a new link, not modifying existing ones. |

---

## AOP — Aspect-Oriented Programming

Cross-cutting concerns are separated from business logic using NestJS's built-in AOP mechanisms (interceptors, filters, guards):

### Logging & Performance Monitoring

[`LoggingPerformanceInterceptor`](src/interfaces/http/interceptors/logging-performance.interceptor.ts) wraps every HTTP handler without modifying any controller code. It records `METHOD /path STATUS TIMEms` on success and logs a warning on failure — a textbook cross-cutting concern applied declaratively.

### Centralised Exception Handling

[`HttpExceptionFilter`](src/interfaces/http/filters/http-exception.filter.ts) catches **any** exception (NestJS `HttpException` or unexpected `Error`) thrown anywhere in the request lifecycle and normalises it into a consistent `{ statusCode, timestamp, path, method, message, errorCode }` JSON response. Controllers never need try/catch blocks for error formatting.

### Security & Authorisation

- **`JwtAuthGuard`** — intercepts protected routes to validate the JWT bearer token before the controller method executes.
- **`RolesGuard`** — checks the authenticated user's role (e.g. `ADMIN`) against the required role declared via a `@Roles()` decorator. Both guards are applied as metadata-driven aspects, keeping controllers free of authorisation logic.

---

## Key Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create a new user account |
| `POST` | `/auth/login` | No | Authenticate and receive a JWT |
| `GET` | `/levels` | No | List the level catalog |
| `GET` | `/levels/:id` | No | Get a single level by ID |
| `POST` | `/levels` | Admin | Create a new level |
| `PUT` | `/levels/:id` | Admin | Update an existing level |
| `GET` | `/progress/me` | Yes | Get the authenticated user's progress |
| `POST` | `/progress/sync` | Yes | Sync client progress to the server |
| `DELETE` | `/progress` | Yes | Delete the authenticated user's progress |
| `GET` | `/leaderboard/:levelId` | No | Get leaderboard entries for a level |
| `POST` | `/leaderboard` | Yes | Submit a leaderboard score |
| `GET` | `/health` | No | Health check |

Interactive Swagger docs available at **`/api/docs`** when the server is running.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** and **Docker Compose** (for PostgreSQL)
- **npm** (comes with Node.js)

### Installation

```powershell
# 1. Clone the repository
git clone https://github.com/arjperez-dev/backend-poc-arrow.git
cd backend-poc-arrow

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 4. Start PostgreSQL via Docker and the API
docker compose up --build

# 5. Run migrations and seed (in a separate terminal if needed)
npx prisma migrate dev
npm run prisma:seed
```

### Run

```powershell
npm run start:dev   # watch mode (hot reload)
npm test            # unit tests
npm run test:e2e    # end-to-end tests
```

> **Note:** There is no `npm run dev` — the dev script is `start:dev`.

---

## Environment Variables

Create a `.env` file from `.env.example`:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@postgres:5432/arrow_poc?schema=public` |
| `JWT_SECRET` | Secret key for JWT signing | `change-me-in-local-env` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL_TEST` | Test database URL | `postgresql://...` |
| `ADMIN_EMAIL` | Optional admin seed email | `admin@example.com` |
| `ADMIN_PASSWORD` | Optional admin seed password | `change-me-admin-password` |

---

## Seed Data

`prisma/levels/manual-levels.ts` contains deterministic, hand-authored, graph-based manual levels. The seed script (`prisma/seed.ts`) upserts them by `Level.number`, ensuring stable `levelId`s the Flutter client maps to.

`prisma/levels/remote-levels.ts` contains additional, real, playable levels reserved in the `number >= 1000` band (see [Backend-Driven Dynamic Levels](#backend-driven-dynamic-levels) below). `seedRemoteLevels()` runs right after the manual seed in `prisma/seed.ts`, upserting by `Level.number` with the same idempotent pattern — re-running `npx prisma db seed` never duplicates rows and never touches numbers 1–30.

If both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the seed also creates or updates an admin user for testing admin-only endpoints via Swagger.

---

## Backend-Driven Dynamic Levels

On top of the offline-first local levels (1–30, bundled with the Flutter client), the backend can serve additional, real, playable levels that the client downloads and merges at runtime — new content ships by seeding the database, with no app rebuild required.

- **Number band**: remote-only levels reserve `number >= 1000` (`1000 + n` in creation order, never reused), keeping them unambiguously separate from the local 1–30 range. `Level.number` is `@unique`, enforcing this at the schema level.
- **2D/3D discriminator**: the graph shape is the source of truth — any node with `z !== 0` makes a level 3D. `definitionJson.metadata.mode: "2d" | "3d"` is an additive hint for the client to route without scanning nodes first; if `mode` and the actual node `z` values ever disagree, the node data wins.
- **No schema change**: `definitionJson: Json` already accepts arbitrary shape and `GraphLevelDefinitionValidator` already permits open `metadata`, so this is a pure data/seeding convention, not a migration.
- **Read path**: the existing `GET /levels` (unauthenticated) already returns full `LevelEntity[]`; the client filters to `number >= 1000` before merging these into its list. No new endpoint was added.
- **Client behaviour is entirely additive and offline-first**: local levels always load and are authoritative; the client fetches remote levels best-effort, appends any not already present locally (local wins on a number conflict), and caches the last successful fetch for offline replay. A backend outage never affects local gameplay.

Full contract: [`docs/DYNAMIC_LEVELS_CONTRACT.md`](docs/DYNAMIC_LEVELS_CONTRACT.md).

---

## Testing

```powershell
npm run lint         # static analysis
npm run test         # unit tests (Jest)
npm run test:e2e     # integration tests (Supertest)
npm run build        # verify production build
```

Current e2e tests use in-memory repositories (Liskov Substitution in action) to avoid destructive operations against the development database.

---

## AI Usage

AI-assisted development is documented in [`AI_USAGE.md`](AI_USAGE.md). Each entry records the date, tool/model, task, prompt, result, team modifications, lessons learned, and critical reflection.

---

## Contributing

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (`feat:`, `fix:`, `docs:`, etc.)
3. Run `npm run lint` and `npm test` before pushing.
4. Open a Pull Request and request review.

---

## License

This project is licensed under the [MIT License](LICENSE).
