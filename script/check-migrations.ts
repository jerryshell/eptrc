#!/usr/bin/env bun

import { $ } from "bun";

const result = await $`bun drizzle-kit check`.quiet().nothrow();

if (result.exitCode !== 0) {
  console.error("Schema has changes not captured in migrations.");
  console.error("Run: bun run db:generate");
  process.exit(result.exitCode);
}

console.log("Migrations are up to date.");
