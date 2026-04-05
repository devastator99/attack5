// server/lib/db.ts
// Export the db instance from the shared db package
export { db } from "@my-better-t-app/db";





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