import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;
let db: NodePgDatabase | null = null;

export function getDb(): NodePgDatabase {
  if (db) return db;
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    throw new Error("DATABASE_URL environment variable is not set. Please add PostgreSQL to your Railway project.");
  }
  
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    db = drizzle(pool);
    return db;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}
