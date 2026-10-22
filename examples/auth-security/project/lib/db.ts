import Database from "better-sqlite3";

export const db = new Database(process.env.DATABASE_PATH ?? "./sqlite.db");
