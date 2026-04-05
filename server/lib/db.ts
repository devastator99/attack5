// server/lib/db.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// 🔐 Neon serverless PostgreSQL connection
// Get your connection string from https://console.neon.tech
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// ✅ Create connection pool optimized for Neon
const pool = new Pool({
  connectionString,
  // Neon handles connection pooling, keep these conservative
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// ✅ Drizzle instance with Neon
export const db = drizzle(pool);

// ✅ Graceful shutdown
export function closeDb() {
  return pool.end();
}





// // server/src/lib/db.ts

// import { drizzle } from "drizzle-orm/node-postgres";
// import { Pool } from "pg";

// const connectionString = process.env.DATABASE_URL;

// if (!connectionString) {
//   throw new Error("DATABASE_URL is not set");
// }

// const pool = new Pool({
//   connectionString,

//   // 🔥 important for scaling
//   max: 10, // max connections
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 5000,
// });

// export const db = drizzle(pool);