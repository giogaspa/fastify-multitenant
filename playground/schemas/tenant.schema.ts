import { LibSQLDatabase } from "drizzle-orm/libsql";
import { sqliteTable, text, real, numeric, int } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
    id: text().primaryKey(),
    name: text().notNull(),
    price: real().notNull(),
    quantity: numeric({ mode: 'number' }).notNull().default(0),
    description: text(),
});

export const greetings = sqliteTable("greetings", {
    id: int().primaryKey({autoIncrement: true}),
    greeting: text().notNull(),
});

export const TenantSchema = {
    products,
    greetings
} as const;

export type TenantDatabaseType = LibSQLDatabase<typeof TenantSchema>;