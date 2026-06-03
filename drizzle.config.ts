import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_DIRECT_URL or DATABASE_URL is required for Drizzle.");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
