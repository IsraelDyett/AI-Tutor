import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// Create the connection instance
const connection = postgres(process.env.POSTGRES_URL);

// Create the Drizzle instance and export it
export const db = drizzle(connection);