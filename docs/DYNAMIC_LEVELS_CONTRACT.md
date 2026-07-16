# Dynamic Levels Contract (Phase 34.1)

This is the contract Phase 34.2–34.4 implement against. It defines how the
backend serves **additional, real, playable** levels (2D and 3D) that the
frontend can download and merge into its level list, on top of the existing
offline-first local levels (1–30). No schema migration was made; see
"Why no migration" below.

---

## 1. 2D/3D discriminator

- The graph shape is the single source of truth: a node with `z !== 0`
  anywhere in a level makes it 3D. This already matches the frontend
  (`ManualGraphNodeDto.z`, default `0`) and the local asset convention
  (`manual_levels_2d.json` vs `manual_levels_3d.json`).
- Additive machine-readable hint: `definitionJson.metadata.mode: "2d" | "3d"`.
  This lets the frontend route to the flat `GraphBoard` or the rotatable
  `Graph3DBoard` without scanning every node first. It is a hint, not the
  source of truth — if `mode` and the actual node `z` values ever disagree,
  the node `z` values win.
- `metadata.mode` is stored inside the existing `definitionJson: Json` column.
  `GraphLevelDefinitionValidator` already treats `metadata` as an open
  `Record<string, unknown>` — adding `mode` requires **no** validator change.
- This does not touch `generationType` (`'manual' | 'random'` on the Prisma
  `Level` model) or the frontend/tool-only `metadata.generationType` strings
  (`'manual' | 'figure' | '3d'`), which are a separate, already-existing
  concept scoped to local asset authoring only.

## 2. Level-number namespace for remote-only levels

- Local gameplay levels occupy **1–30** (`manual_levels_2d.json` 1–20,
  `manual_levels_3d.json` 21–30). Backend rows 16–30 currently hold
  placeholder `definitionJson` used only for id↔number progress/leaderboard
  mapping (per `manual-levels.ts`) — this slice does **not** repurpose them.
- New remote-only playable levels reserve the band **`number >= 1000`**.
  Rule: `remoteLevel.number = 1000 + n` for the nth remote level, assigned in
  creation order, never reused. This keeps remote numbers unambiguously out
  of the 1–30 local range and the existing 1–30 seed rows, with generous
  headroom before any future local range expansion.
- `Level.number` is already `@unique` in `schema.prisma`; no schema change is
  needed to enforce the reservation, only seeding/admin-flow discipline
  (34.2's concern).

## 3. Read contract

- The frontend fetches remote level definitions from `GET /levels`
  (unauthenticated, already returns full `LevelEntity[]` including
  `definitionJson`). `GET /levels/:id` remains available for single-level
  refetch/cache-repair but is not the primary bulk-fetch path.
- The frontend will filter the response to `number >= 1000` before mapping —
  rows `1–30` are already covered by local assets and must be ignored by the
  new remote-fetch path to avoid duplicating/overriding local content (34.3's
  concern; this slice only documents the contract).
- Field-by-field mapping, `LevelEntity` (backend) → `ManualLevelDto` (frontend,
  `lib/features/game/infrastructure/manual_level_dto.dart`):

  | Backend `LevelEntity` field | Type | Frontend `ManualLevelDto` field | Notes |
  |---|---|---|---|
  | `number` | `number` (int) | `number` | must be `>= 1000` for remote levels |
  | `name` | `string` | `name` | direct |
  | `difficulty` | `'easy'\|'medium'\|'hard'` | `difficulty` | direct |
  | `definitionJson.nodes[]` | `{id,x,y,z?}[]` | `definitionJson.nodes` → `ManualGraphNodeDto` | `z` optional, defaults 0 |
  | `definitionJson.edges[]` | `{id,fromNodeId,toNodeId,direction}[]` | `definitionJson.edges` → `ManualGraphEdgeDto` | `direction` field is ignored by the frontend edge DTO (recomputed), kept for parity with local JSON |
  | `definitionJson.arrows[]` | `{id,occupiedEdges,startNodeId,endNodeId,direction}[]` | `definitionJson.arrows` → `ManualArrowPathDto` | direct |
  | `definitionJson.blockedEdges[]` | `string[]` | `definitionJson.blockedEdges` | direct, expected empty per convention |
  | `definitionJson.metadata` | object | `definitionJson.metadata` | must include `mode: "2d"|"3d"`; `generationType`/`timeLimit`/`maxMoves` remain dormant fields, unused by gameplay per existing constraints |
  | `id`, `createdAt`, `updatedAt`, `generationType`, `seed` | — | — | not part of `ManualLevelDto`; `id` is still needed separately for progress/leaderboard mapping (existing `ApiRemoteLevelRepository` behavior, unchanged) |

- This is a 1:1 structural match already — no backend response shape change
  and no new frontend DTO fields are required for 34.3 to implement the
  mapping.

## 4. Schema change

**None.** `definitionJson: Json` already accepts arbitrary shape, and
`GraphLevelDefinitionValidator` already permits open `metadata`. Adding
`metadata.mode` and reserving a number band are both pure data/convention
decisions enforced at the seeding/admin layer (34.2), not the schema layer.
A migration would only be justified if `mode` needed to be queried/filtered
in SQL (e.g. `WHERE mode = '3d'`) — the current use case (frontend reads full
`GET /levels` and inspects JSON client-side, exactly as it already does for
`number`/`id` today) does not require that.

## 5. Constraints carried forward to 34.2+

- Existing rows 1–15 (real) and 16–30 (placeholder mapping) are untouched.
- Auth, sync, leaderboard, and existing endpoint contracts are unchanged.
- Remote levels are additive only; local levels remain the offline source of
  truth and always load first (34.4's concern).

## 6. Seed workflow (Phase 34.2)

- Real, playable remote-band definitions live in
  `backend-poc-arrow/prisma/levels/remote-levels.ts` (`remoteLevels: RemoteLevelSeed[]`),
  authored directly (not through the 2D-only grid builder in
  `manual-levels.ts`) so 3D shapes (`z`, `above`/`below` directions) can be
  expressed. Each entry sets `definitionJson.metadata.mode` per §1 and uses a
  `number >= 1000` per §2.
- `prisma/seed.ts` runs `seedRemoteLevels()` right after `seedManualLevels()`
  in `main()`. It upserts by `number` (same idempotent pattern as the manual
  seed) — re-running `npx prisma db seed` never duplicates rows and never
  touches numbers 1–30.
- Currently seeded: `1000` "Remote First Exit" (2D, easy), `1001` "Remote
  Vertical Post" (3D, medium — one vertical post arrow plus two horizontal
  arrows across two z-layers).
- `POST /levels` / `PUT /levels` (ADMIN) already accept and round-trip these
  shapes unchanged: `GraphLevelDefinitionValidator` only checks the five
  top-level keys/types, and `PrismaLevelRepository` stores/reads
  `definitionJson` as opaque JSON. Covered by
  `create-level.use-case.spec.ts`'s
  `should_round_trip_3d_definition_json_unchanged_when_creating_a_remote_band_level`
  and `graph-level-definition.spec.ts`'s
  `should_accept_3d_level_definition_with_non_zero_z_and_mode_metadata`.
