import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const db = createClient({
	url: process.env.DATABASE_URL,
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const initializeDB = async () => {
	await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT,
      username TEXT,
      content TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

	await db.execute(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const dbClient = db;
