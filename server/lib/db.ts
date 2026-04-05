// server/src/lib/db.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// 🔐 Make sure this exists in your .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// ✅ create pg pool
const pool = new Pool({
  connectionString,
});

// ✅ drizzle instance
export const db = drizzle(pool);








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