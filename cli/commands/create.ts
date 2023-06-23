import fs from 'fs'
import path from 'path'

import log from '../utils/log'
import parseArgs from '../utils/args'
import {
    getAdminMigrationsFolder,
    getTenantMigrationsFolder,
    getMultitenantSubject,
    SUBJECT,
    isTSProject,
    getMigrationTemplatePath,
    getFormattedDate
} from '../utils/utils'

import generate from '../utils/generate'

const MIGRATION_TEMPLATE_EXTENSION = isTSProject() ? 'ts' : 'js';

const args = parseArgs()

export default function cli() {
    const subject = getMultitenantSubject();

    generateMigrationFor({ subject, name: args.migrationName });
}

function generateMigrationFor({ subject = null, name = '' }: { subject: any, name: string }): void {
    // Create migration folder
    createMigrationsFolder();

    // Create empty file
    const date = getFormattedDate();

    const migrationName = name.length > 0
        ? `${date}_${name}`
        : `${date}`;

    const fileName = `${migrationName}.${MIGRATION_TEMPLATE_EXTENSION}`;

    const filePath = SUBJECT.admin === subject
        ? path.join(getAdminMigrationsFolder(), fileName)
        : path.join(getTenantMigrationsFolder(), fileName);

    const data = {
        migrationName: migrationName,
    };

    generate(getMigrationTemplatePath(), filePath, data)
        .catch(function (err) {
            if (err) {
                log('error', err.message);
                process.exit(1);
            }
        });
}

function createMigrationsFolder() {
    mkdir(getAdminMigrationsFolder());
    mkdir(getTenantMigrationsFolder());
}

function mkdir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}