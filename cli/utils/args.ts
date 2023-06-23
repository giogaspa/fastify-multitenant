'use strict'

import { existsSync } from "fs"
import { join } from "path";

import argv from 'yargs-parser'
import dotenv from 'dotenv'

type Arguments = {
  folder?: string,
  adminFolder?: string,
  tenantFolder?: string,
  dbConnectionUrl?: string,
  migrationsTableName?: string,
  tenantsTableName?: string,
  name: string, //Migration name
  tenantId?: string,
  tenantHostname?: string,
  tenantConnectionUrl?: string,
}

const DEFAULT_ARGUMENTS: Arguments = {
  folder: 'migrations',
  adminFolder: 'admin',
  tenantFolder: 'tenant',
  dbConnectionUrl: '',
  migrationsTableName: 'migrations',
  tenantsTableName: 'tenants',
  name: '', //Migration name
  tenantId: '',
  tenantHostname: '',
  tenantConnectionUrl: '',
};

const DEFAULT_MULTITENANT_CONFIG = {
  env: '.env',
  adminDBConnectionEnvVar: 'FASTIFY_MULTITENANT_DB_CONNECTION_URL',
}

function getMultitenantConfigurationFile() {
  return join(process.cwd(), 'multitenant.js');
}

function existMultitenantConfigurationFile() {
  return existsSync(getMultitenantConfigurationFile());
}

function parseArgs(args: any = ''): Arguments | any {

  let cliConfiguration = null;
  if (existMultitenantConfigurationFile()) {
    cliConfiguration = { ...DEFAULT_MULTITENANT_CONFIG, ...require(getMultitenantConfigurationFile()) };
    dotenv.config({ path: cliConfiguration.envPath });

  } else {
    dotenv.config();
  }

  const commandLineArguments = argv(args, {
    configuration: {
      'populate--': true
    },
    string: ['folder', 'admin-folder', 'tenant-folder', 'db-connection-url', 'migrations-table-name', 'tenants-table-name', 'name', 'tenant-id', 'tenant-hostname', 'tenant-connection-url'],
    envPrefix: 'FASTIFY_MULTITENANT_',
  });

  // Merge objects from lower to higher priority
  const parsedArgs = { ...DEFAULT_ARGUMENTS, ...commandLineArguments };

  const migrationName = parsedArgs.name.length > 0
    ? parsedArgs.name
    : args[3] && args[3].toString().startsWith('-')
      ? ''
      : args[3];

  return {
    _: args,
    command: args[2],
    folder: parsedArgs.folder,
    adminFolder: parsedArgs.adminFolder,
    tenantFolder: parsedArgs.tenantFolder,
    dbConnectionUrl: cliConfiguration
      ? process.env[cliConfiguration.adminDBConnectionEnvVar]
      : parsedArgs.dbConnectionUrl,
    migrationsTableName: parsedArgs.migrationsTableName,
    migrationName: migrationName,
    tenantsTableName: parsedArgs.tenantsTableName,
    tenantId: parsedArgs.tenantId,
    tenantHostname: parsedArgs.tenantHostname,
    tenantConnectionUrl: parsedArgs.tenantConnectionUrl,
  };
}

let _args: Arguments | null = null;

export default function (): any {
  if (_args === null) {
    _args = parseArgs(process.argv);
  }

  return _args;
}