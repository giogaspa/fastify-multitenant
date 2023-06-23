import path from 'path'

import parseArgs from './args'

const args = parseArgs()

export const SUBJECT = Object.freeze({
  admin: 'admin',
  tenant: 'tenant'
});

const PACKAGE_JSON = require(path.join(process.cwd(), 'package.json'));

export function getMultitenantSubject() {
  return args.command.includes(SUBJECT.admin)
    ? SUBJECT.admin
    : SUBJECT.tenant;
}

export function getAdminMigrationsFolder() {
  return path.join(args.folder, args.adminFolder);
}

export function getTenantMigrationsFolder() {
  return path.join(args.folder, args.tenantFolder);
}

export function isTSProject() {
  return !!PACKAGE_JSON.devDependencies.typescript
}

export function getMigrationTemplatePath() {
  if (isTSProject()) {
    return require.resolve(`@giogaspa/fastify-multitenant/src/migrations/templates/migration.ts`)
  }

  return require.resolve(`@giogaspa/fastify-multitenant/src/src/migrations/templates/migration.js`)
}

export function getCreateTenantsTableTemplatePath() {
  if (isTSProject()) {
    return require.resolve(`@giogaspa/fastify-multitenant/src/migrations/templates/createTenantsTable.ts`)
  }

  return require.resolve(`@giogaspa/fastify-multitenant/src/migrations/templates/createTenantsTable.js`)
}

export function getFormattedDate() {
  let d = new Date(),
    day = '' + d.getDate(),
    month = '' + (d.getMonth() + 1),
    year = d.getFullYear(),
    hours = d.getHours().toString(),
    minutes = d.getMinutes().toString(),
    seconds = d.getSeconds().toString();

  if (month.length < 2)
    month = '0' + month;
  if (day.length < 2)
    day = '0' + day;
  if (hours.length < 2)
    hours = '0' + hours;
  if (minutes.length < 2)
    minutes = '0' + minutes;
  if (seconds.length < 2)
    seconds = '0' + seconds;

  return [year, month, day, hours, minutes, seconds].join('');
}