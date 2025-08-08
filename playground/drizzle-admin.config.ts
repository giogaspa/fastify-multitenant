import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './migrations/admin/',
    schema: './schemas/admin.schema.ts',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DB_URL!,
    },
    migrations: {
        table: 'migrations',
    },
});