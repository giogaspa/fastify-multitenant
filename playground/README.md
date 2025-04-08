# Playground

## Drizzle commands

### Admin
Generate migrations

```bash
npx drizzle-kit generate --config=./drizzle-admin.config.ts --name=migration_name
```

Migrate
```bash
DB_URL=file:./data/admin.db npx drizzle-kit migrate --config=./drizzle-admin.config.ts
```

### Tenant
Generate migrations

```bash
npx drizzle-kit generate --config=./drizzle-tenant.config.ts --name=migration_name
```

Migrate
```bash
DB_URL=file:./data/tenant-xxx.db npx drizzle-kit migrate --config=./drizzle-tenant.config.ts
```