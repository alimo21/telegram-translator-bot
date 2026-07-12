import { pgTable, serial, text, integer, timestamp, boolean, bigint } from "drizzle-orm/pg-core";

export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token").notNull(),
  apiId: integer("api_id").notNull(),
  apiHash: text("api_hash").notNull(),
  phoneNumber: text("phone_number"),
  sessionString: text("session_string"),
  sourceChannel: text("source_channel").notNull(),
  destChannel: text("dest_channel").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const processedMessages = pgTable("processed_messages", {
  id: serial("id").primaryKey(),
  sourceMessageId: integer("source_message_id").notNull(),
  sourceChannel: text("source_channel").notNull(),
  destMessageId: integer("dest_message_id"),
  processedAt: timestamp("processed_at").defaultNow(),
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});
