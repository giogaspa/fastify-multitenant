import path from 'path'
import { nanoid } from 'nanoid'

import {
    getMultitenantSubject,
    SUBJECT,
    getCreateTenantsTableTemplatePath,
    getFormattedDate,
    isTSProject,
    getAdminMigrationsFolder,
} from '../utils/utils';
import {
    addTenantToAdmin,
    createMigrationsTable,
    dbClientFactory,
    existsMigrationsTable
} from '../services/dbClientFactory';
import parseArgs from '../utils/args';
import generate from '../utils/generate';
import log from '../utils/log'

const args = parseArgs()

const TENANTS_MIGR_FILENAME = 'create_tenants_table';
const MIGRATION_TEMPLATE_EXTENSION = isTSProject() ? 'ts' : 'js';

export default async function cli() {
    log('info', 'Installing...');

    await install();
}

async function install() {
    const subject = getMultitenantSubject();

    if (SUBJECT.admin === subject) {

        if (await existsMigrationsTable() === true) {
            log('info', 'Migrations table is already created!');
            return
        }

        log('info', 'Create admin migrations table');
        await createMigrationsTable();

        log('info', 'Create admin tenants migration');
        await addTenantsTableMigration();

        log('info', 'Now run `npx multitenant migrate:admin` to execute migration.');

        return;
    }

    if (SUBJECT.tenant === subject) {
        const tenant = {
            id: args.tenantId ? args.tenantId : nanoid(),
            hostname: args.tenantHostname,
            connectionString: args.tenantConnectionUrl,
        }

        log('info', `Create tenant`);

        if (!tenant.hostname || tenant.hostname.length === 0) {
            log('error', 'Mandatory "--tenant-hostname" parameter is missing')
            process.exit(1)
        }

        if (!tenant.connectionString || tenant.connectionString === 0) {
            log('error', 'Mandatory "--tenant-connection-url" parameter is missing')
            process.exit(1)
        }

        const tenantDB = dbClientFactory(tenant.connectionString);

        log('info', 'Add tenant to admin database');
        await addTenantToAdmin(tenant);

        log('info', 'Create tenant migrations table');
        await createMigrationsTable(tenantDB);

        log('info', `Now run \`npx multitenant migrate:tenant --tenant-id ${tenant.id}\` to execute migration for tenant.`);

        tenantDB.destroy();
    }
}

async function addTenantsTableMigration() {
    const date = getFormattedDate();
    const migrationName = `${date}_${TENANTS_MIGR_FILENAME}`;

    const fileName = `${migrationName}.${MIGRATION_TEMPLATE_EXTENSION}`;

    const destFilePath = path.join(getAdminMigrationsFolder(), fileName);

    const data = {
        migrationName: migrationName,
        tenantsTableName: args.tenantsTableName
    };

    generate(getCreateTenantsTableTemplatePath(), destFilePath, data)
        .catch(function (err) {
            if (err) {
                log('error', err.message);
                process.exit(1);
            }
        });
}