import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { dbFileName } from "../constants";
import Database from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import path from "path";

declare const EPTRC_MIGRATIONS:
  | {
      sql: string;
      timestamp: number;
    }[]
  | undefined;

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

function migrationsFromDir(dir: string): MigrationEntry[] {
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return dirs
    .map((name) => {
      const file = path.join(dir, name, "migration.sql");
      if (!Bun.file(file).size) return;
      return {
        sql: readFileSync(file, "utf-8"),
        timestamp: toTimestamp(name),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp) as MigrationEntry[];
}

const sqliteClient = new Database(dbFileName, { create: true });

sqliteClient.run("PRAGMA journal_mode = WAL;");
sqliteClient.run("PRAGMA synchronous = NORMAL");
sqliteClient.run("PRAGMA busy_timeout = 5000");
sqliteClient.run("PRAGMA cache_size = -64000");
sqliteClient.run("PRAGMA foreign_keys = ON;");

export const db = drizzle({ client: sqliteClient, casing: "snake_case" });

const entries =
  typeof EPTRC_MIGRATIONS !== "undefined"
    ? EPTRC_MIGRATIONS
    : migrationsFromDir(path.join(import.meta.dirname, "../../drizzle"));

if (entries.length > 0) {
  migrate(db, entries);
}
