#!/usr/bin/env bun

import path from "path";
import { readdirSync, readFileSync, mkdirSync } from "fs";
import pkg from "../package.json";

type MigrationEntry = { sql: string; timestamp: number };

function toTimestamp(tag: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(tag);
  if (!match) return 0;
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
}

function loadMigrations(dir: string): MigrationEntry[] {
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^\d{14}/.test(name))
    .sort();

  return dirs
    .map((name) => {
      const file = path.join(dir, name, "migration.sql");
      if (!Bun.file(file).size) return;
      return {
        sql: readFileSync(file, "utf-8"),
        timestamp: toTimestamp(name),
      };
    })
    .filter(Boolean) as MigrationEntry[];
}

const mode = Bun.argv[2];

if (!mode) {
  console.error(
    "Usage: bun run script/build.ts <bun|linux-x64|windows-x64|darwin-x64|darwin-arm64>",
  );
  process.exit(1);
}

mkdirSync("dist", { recursive: true });

const migrations = loadMigrations(path.join(import.meta.dirname, "../drizzle"));
console.log(`Loaded ${migrations.length} migrations`);

const define = {
  EPTRC_MIGRATIONS: JSON.stringify(migrations),
};

const common = {
  entrypoints: ["./src/index.ts"],
  define,
};

if (mode === "bun") {
  const result = await Bun.build({
    ...common,
    target: "bun",
    outdir: "dist",
    minify: true,
    sourcemap: "external",
  });
  if (!result.success) process.exit(1);
  process.exit(0);
}

const targetMap = {
  "linux-x64": "bun-linux-x64-modern",
  "windows-x64": "bun-windows-x64-modern",
  "darwin-x64": "bun-darwin-x64-modern",
  "darwin-arm64": "bun-darwin-arm64-modern",
} as const;

const target = targetMap[mode as keyof typeof targetMap];
if (!target) {
  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}

const outfile = `dist/${pkg.name}-${mode}`;
const result = await Bun.build({
  ...common,
  minify: true,
  sourcemap: "external",
  compile: {
    target,
    outfile,
    bytecode: true,
  },
} as any);

if (!result.success) process.exit(1);
