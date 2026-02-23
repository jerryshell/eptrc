# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the Bun + Hono service entrypoint and business logic.
- `src/index.ts` defines HTTP routes and starts interval-based background tasks.
- `src/db/` stores Drizzle ORM setup and table definitions (`schema.ts`).
- `src/task.ts`, `src/utils.ts`, and `src/middleware.ts` contain task, helper, and auth logic.
- `script/` includes maintenance/build scripts (`build.ts`, `check-migrations.ts`).
- `drizzle/` contains generated migration SQL and snapshots.
- `test/` includes runnable integration scripts per API behavior.
- `dist/` is generated output and should not be edited by hand.

## Build, Test, and Development Commands

- `bun install`: install project dependencies.
- `bun run dev`: run the API locally with hot reload (`http://localhost:3000`).
- `bun run lint`: run `oxlint` checks.
- `bun run lint:fix`: apply lint autofixes where available.
- `bun run db:generate`: generate Drizzle migrations after schema changes.
- `bun run db:check`: verify schema and migration files are in sync.
- `bun run db:push`: apply schema changes to the configured SQLite DB.
- `bun run build:bun` or `bun run build:windows-x64`: build distributables into `dist/`.
- `bun run test/paymentSession.create.ts`: run an integration script (start `bun run dev` first).

## Coding Style & Naming Conventions

- Language: TypeScript (ESNext modules) with Bun runtime.
- Use 2-space indentation, semicolons, double quotes, and trailing commas where appropriate.
- Use `camelCase` for variables/functions, `PascalCase` for types, and descriptive constant names.
- Keep route handlers readable; move reusable logic into `src/utils.ts` or `src/task.ts`.
- Follow existing file naming patterns such as `paymentSession.create.ts` and `wallet.collect.ts`.

## Testing Guidelines

- Current tests are integration scripts in `test/*.ts`, not a unit-test framework.
- Add new test files using `<resource>.<action>.ts` naming.
- For endpoint changes, validate both HTTP status and key response fields.
- Before opening a PR, run relevant integration scripts plus `bun run lint` and `bun run db:check`.

## Commit & Pull Request Guidelines

- Commit style in this repo follows Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep each commit focused on one logical change.
- PRs should include: goal, impacted endpoints/schema, commands run for validation, and any required env updates.

## Security & Configuration Tips

- Never commit real secrets (`API_KEY`, `WEBHOOK_KEY`, private keys) or production wallet data.
- Keep sensitive values in `.env`; avoid logging private keys in debug output.
- Validate on `TRON_NETWORK=nile` before proposing mainnet-impacting changes.
