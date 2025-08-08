import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './migrations/tenant/',
    schema: './schemas/tenant.schema.ts',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DB_URL!,
    },
    migrations: {
        table: 'migrations',
    },
});