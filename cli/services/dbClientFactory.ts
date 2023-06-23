import { URL } from "url";

import knex, { Knex } from "knex";

import log from "../utils/log";
import parseArgs from "../utils/args";
import { Tenant } from "../../src";
import { createMigrationsTableQuery } from "../../src/migrations/postgres/util";

const args = parseArgs();

function createKnexConfiguration(url: string) {

    const connectionURL = new URL(url);
    const dbClient = connectionURL.protocol.replace(':', '');

    switch (dbClient) {
        case 'mysql':
            return {
                client: 'mysql',
                connection: {
                    host: connectionURL.hostname,
                    port: connectionURL.port,
                    user: connectionURL.username,
                    password: connectionURL.password,
                    database: connectionURL.pathname.replace('/', '')
                }
            }
        case 'postgresql':
            return {
                client: 'pg',
                connection: url
            }
        default:
            throw new Error('Unsupported database');
    }

}

export function dbClientFactory(connectionURL?: string): Knex<any | unknown> {
    return knex(
        createKnexConfiguration(connectionURL
            ? connectionURL
            : args.dbConnectionUrl)
    );
};

// Retrieve tenant with ID
export async function getTenant(tenantId: string): Promise<Tenant | undefined> {
    const adminDB = dbClientFactory();

    const tenant = await adminDB
        .select()
        .from(args.tenantsTableName)
        .where({ id: tenantId })
        .first();

    await adminDB.destroy();

    return {
        id: tenant.id,
        hostname: tenant.hostname,
        connectionString: tenant.connection_string
    } as Tenant;
}

export async function getAllTenants(): Promise<Tenant[]> {
    const adminDB = dbClientFactory();

    const tenants = await adminDB
        .select()
        .from(args.tenantsTableName);

    await adminDB.destroy();

    return tenants.map(t => ({
        id: t.id,
        hostname: t.hostname,
        connectionString: t.connection_string
    } as Tenant));
}

export async function existsMigrationsTable(db?: Knex) {
    if (!db) {
        db = dbClientFactory();
    }

    const exists = await db.schema.hasTable(args.migrationsTableName);

    await db.destroy();

    return exists;
}

export async function existsTenantsTable() {
    const adminDB = dbClientFactory();

    const exists = await adminDB.schema.hasTable(args.migrationsTableName);

    await adminDB.destroy();

    return exists
}

export async function addTenantToAdmin(tenant: Tenant): Promise<void> {
    const adminDB = dbClientFactory();

    await adminDB(args.tenantsTableName).insert({
        id: tenant.id,
        hostname: tenant.hostname,
        connection_string: tenant.connectionString
    });

    await adminDB.destroy();
}

export async function createMigrationsTable(db?: Knex) {
    if (!db) {
        db = dbClientFactory();
    }

    if (await db.schema.hasTable(args.migrationsTableName)) {
        log('info', 'Migrations table is already installed!');

        await db.destroy();

        return true;
    }

    // Create table
    await db.raw(createMigrationsTableQuery(args.migrationsTableName))

    await db.destroy();

    log('info', 'Created migrations table!');
}