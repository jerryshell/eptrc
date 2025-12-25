import { defineConfig } from "drizzle-kit";
import { dbFileName } from "./src/constants";

export default defineConfig({
  out: "drizzle",
  schema: "src/db/schema.ts",
  dialect: "sqlite",
  casing: "snake_case",
  dbCredentials: {
    url: dbFileName,
  },
});
