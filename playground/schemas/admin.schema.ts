import { sqliteTable, text, BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { LibSQLDatabase } from "drizzle-orm/libsql";

export const tenantsConfig = sqliteTable("tenants_config", {
    id: text().primaryKey(),
    name: text().notNull(),
    db: text().notNull(),
});

export const AdminSchema = {
    tenantsConfig
} as const;

export type AdminDatabaseType = LibSQLDatabase<typeof AdminSchema>;