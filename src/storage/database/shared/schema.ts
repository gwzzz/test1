import { pgTable, serial, timestamp, varchar, integer, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    en: varchar("en", { length: 255 }).default("").notNull(),
    author: varchar("author", { length: 128 }).default("").notNull(),
    desc: text("desc").default(""),
    img: varchar("img", { length: 1024 }).default(""),
    sort_order: integer("sort_order").default(0).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("books_sort_order_idx").on(table.sort_order),
    index("books_created_at_idx").on(table.created_at),
  ]
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    price: varchar("price", { length: 64 }).default("").notNull(),
    emoji: varchar("emoji", { length: 32 }).default("").notNull(),
    tag: varchar("tag", { length: 64 }).default("").notNull(),
    sort_order: integer("sort_order").default(0).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("products_sort_order_idx").on(table.sort_order),
    index("products_created_at_idx").on(table.created_at),
  ]
);