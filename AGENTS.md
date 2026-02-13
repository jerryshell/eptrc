# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the Bun + Hono service code.
- `src/index.ts` defines routes and background intervals.
- `src/db/` stores Drizzle setup and schema (`schema.ts`).
- `src/task.ts` and `src/utils.ts` contain polling jobs and Tron helpers.
- `test/` contains runnable integration scripts (not unit-test specs).
- `dist/` is build output for runtime and compiled binaries.
- Root config files: `package.json`, `tsconfig.json`, `drizzle.config.ts`, and `.env`.

## Build, Test, and Development Commands

- `bun install`: install dependencies.
- `bun run dev`: start local server with hot reload (`http://localhost:3000`).
- `bun run check`: run TypeScript type checks (`bunx tsc --noEmit`).
- `bun run db:push`: push Drizzle schema to the SQLite DB.
- `bun run build:bun`: build Bun target into `dist/`.
- `bun run build:linux-x64` (or `build:windows-x64`, `build:darwin-*`): create standalone binaries.
- Example integration run: start `bun run dev` in one terminal, then run `bun test/paymentSession.create.ts` in another.

## Coding Style & Naming Conventions

- Language: TypeScript with ESNext modules.
- Indentation: 2 spaces; keep trailing commas where existing style uses them.
- Prefer `camelCase` for variables/functions, `PascalCase` for types, and descriptive constant names.
- Keep route handlers small; move blockchain/db helpers to `src/utils.ts` or `src/task.ts`.
- Run `bun run check` before opening a PR.

## Testing Guidelines

- Current tests are integration scripts under `test/*.ts` that hit a running local server.
- Name new test files by endpoint/action, e.g. `paymentSession.refund.ts`.
- Validate HTTP status and JSON body fields in each script.
- There is no enforced coverage threshold yet; add tests for every behavior change and bug fix.

## Commit & Pull Request Guidelines

- Git history is minimal (`init`), so no strict legacy convention exists yet.
- Use concise imperative commit subjects; prefer Conventional Commit style (`feat:`, `fix:`, `chore:`).
- Keep commits focused and logically grouped.
- PRs should include: purpose, key API/database changes, test evidence (commands + outputs), and any env/config updates.

## Security & Configuration Tips

- Never commit real API keys or private keys; keep secrets in `.env`.
- Treat `feePayerPrivateKey` and wallet keys as sensitive and avoid logging them.
- Use `TRON_NETWORK=nile` for testnet validation before mainnet changes.
