const MIGRATION_NAME = 'M__migrationName__';

async function up(db) {
    await db.schema.createTable('__tenantsTableName__', function (table) {
        table.string('id', 36).primary();
        table.string('hostname').unique();
        table.string('connection_string'); //Database connection URL
        table.timestamps(true, true);
        table.index(['hostname'], 'idx_hostname');
    });
}

async function down(db) {
    await db.schema.dropTable('tenants')
}

module.exports = {
    name: MIGRATION_NAME,
    up,
    down
}