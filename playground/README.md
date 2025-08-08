# Playground

## Start project

```bash
npm run dev
```


## Drizzle commands

### Admin

Generate migrations:

```bash
npx drizzle-kit generate --config=./drizzle-admin.config.ts --name=migration_name
```

Migrate:

```bash
DB_URL=file:./data/admin.db npx drizzle-kit migrate --config=./drizzle-admin.config.ts
```

### Tenant

Generate migrations:

```bash
npx drizzle-kit generate --config=./drizzle-tenant.config.ts --name=migration_name
```

Migrate:

Remember to update the `DB_URL=file:./data/tenant-xxx.db` variable with the SQLite tenant database you want.

```bash
DB_URL=file:./data/tenant-xxx.db npx drizzle-kit migrate --config=./drizzle-tenant.config.ts
```