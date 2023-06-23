import { Knex } from "knex";

export const MIGRATION_NAME = 'M__migrationName__';

export async function up(db: Knex) {
    await db.schema.createTable('__tenantsTableName__', function (table) {
        table.string('id', 36).primary();
        table.string('hostname').unique();
        table.string('connection_string'); //Database connection URL
        table.timestamps(true, true);
        table.index(['hostname'], 'idx_hostname');
    });
}

export async function down(db: Knex) {
    await db.schema.dropTable('tenants')
}