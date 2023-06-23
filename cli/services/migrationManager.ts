import { readdirSync, lstatSync } from 'fs'
import path from 'path'

import { Knex } from "knex";

import log from "../utils/log";
import parseArgs from "../utils/args";
import { getAdminMigrationsFolder, getTenantMigrationsFolder } from "../utils/utils";
import { dbClientFactory } from "../services/dbClientFactory";
import { Tenant } from '../../src';
import { tsImport } from '../utils/tsImport';

const args = parseArgs();

async function makeMigrationManagerFor(db: Knex, folder: string) {

    async function runMissingMigrations() {
        const missingMigrationsFile = await getMissingMigrationsFrom();

        if (missingMigrationsFile.length === 0) {
            log('info', 'No migration to execute');
            return;
        }

        for (const migrationFile of missingMigrationsFile) {

            const migration = isTsFile(migrationFile)
                ? await tsImport(migrationFile)
                : await import(migrationFile);

            await execute(migration);
        }

        log('info', `Executed ${missingMigrationsFile.length} ${missingMigrationsFile.length > 1 ? 'migrations' : 'migration'}`);
    }

    async function getMissingMigrationsFrom() {
        const allMigrations = readdirSync(folder)
            .map(filename => path.join(process.cwd(), folder, filename))
            .filter(file => lstatSync(file).isFile()) //keep only files
        //.map(filename => filename.replace('.js', '')); //remove file extension

        const executedMigrations = (await db.select()
            .from(args.migrationsTableName))
            .map(m => m.name);

        const migrations = []

        for (const migrationFile of allMigrations) {

            const migration = isTsFile(migrationFile)
                ? await tsImport(migrationFile)
                : await import(migrationFile);

            if (!executedMigrations.includes(migration.MIGRATION_NAME)) {
                migrations.push(migrationFile)
            }
        }

        return migrations;
    }

    async function execute(migration: any) {
        log('info', `Execute ${migration.MIGRATION_NAME} migration`);

        try {
            await migration.up(db);
            await save(migration);
        } catch (error) {
            log('error', JSON.stringify(error));
        }
    }

    async function save(migration: any) {
        await db(args.migrationsTableName)
            .insert({ name: migration.MIGRATION_NAME });
    }

    function isTsFile(filename: string): boolean {
        return filename.slice(-2) === 'ts'
    }

    return {
        run: runMissingMigrations,
    }
}

export async function runMissingMigrationsForTenant(tenant: Tenant) {
    const tenantDB = dbClientFactory(tenant.connectionString);
    const tenantMigrationManager = await makeMigrationManagerFor(tenantDB, getTenantMigrationsFolder());
    await tenantMigrationManager.run();
    tenantDB.destroy();
}

export async function runMissingMigrationsForAdmin() {
    const adminDB = dbClientFactory();
    const adminMigrationManager = await makeMigrationManagerFor(adminDB, getAdminMigrationsFolder());
    await adminMigrationManager.run();
    adminDB.destroy();
}