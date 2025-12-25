import { drizzle } from "drizzle-orm/bun-sqlite";
import { dbFileName } from "../constants";
import Database from "bun:sqlite";

const sqliteClient = new Database(dbFileName);

sqliteClient.run("PRAGMA journal_mode = WAL;");

export const db = drizzle({ client: sqliteClient, casing: "snake_case" });
