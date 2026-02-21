# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the Bun + Hono service.
- `src/index.ts` defines HTTP routes and background intervals.
- `src/db/` holds Drizzle setup and schema (`schema.ts`).
- `src/task.ts` and `src/utils.ts` provide polling jobs and Tron helpers.
- `test/` contains runnable integration scripts (not unit-test specs).
- `dist/` is build output for runtime and compiled binaries.
- Root config files: `package.json`, `tsconfig.json`, `drizzle.config.ts`, `.env`.

## Build, Test, and Development Commands

- `bun install`: install dependencies.
- `bun run dev`: start local server with hot reload at `http://localhost:3000`.
- `bun run check`: run TypeScript type checks (`bunx tsc --noEmit`).
- `bun run db:push`: push Drizzle schema to the SQLite DB.
- `bun run build:bun`: build Bun target into `dist/`.
- `bun run build:linux-x64` (or `build:windows-x64`, `build:darwin-*`): build standalone binaries.
- Integration example: run `bun run dev`, then `bun test/paymentSession.create.ts`.

## Coding Style & Naming Conventions

- Language: TypeScript (ESNext modules).
- Indentation: 2 spaces; keep trailing commas where used.
- Naming: `camelCase` for variables/functions, `PascalCase` for types, descriptive constants.
- Keep route handlers small; move blockchain/db helpers to `src/utils.ts` or `src/task.ts`.
- Run `bun run check` before opening a PR.

## Testing Guidelines

- Tests are integration scripts under `test/*.ts`.
- Name new tests by endpoint/action (e.g., `paymentSession.refund.ts`).
- Validate HTTP status and JSON body fields in each script.
- No enforced coverage threshold yet.

## Commit & Pull Request Guidelines

- Use concise, imperative commit subjects; prefer Conventional Commit style (`feat:`, `fix:`, `chore:`).
- Keep commits focused and logically grouped.
- PRs should include: purpose, key API/database changes, test evidence (commands + outputs), and env/config updates.

## Security & Configuration Tips

- Never commit real API keys or private keys; keep secrets in `.env`.
- Treat `feePayerPrivateKey` and wallet keys as sensitive and avoid logging them.
- Use `TRON_NETWORK=nile` for testnet validation before mainnet changes.
