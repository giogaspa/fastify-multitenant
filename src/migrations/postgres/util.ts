const TABLE_NAME = 'migrations';

export function createMigrationsTableQuery(tableName = TABLE_NAME) {
    return `
    CREATE TABLE "${tableName}" (
        id serial PRIMARY KEY,
        "name" VARCHAR ( 255 ) UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
     )`
}