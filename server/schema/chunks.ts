// schema/chunks.ts
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  checksum: text("checksum").notNull(),
  storageKey: text("storage_key"),
  etag: text("etag"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});