# Fastify Multi-Tenancy Plugin

A flexible and fully pluggable multi-tenancy plugin for Fastify, written in **TypeScript**. It supports multiple tenant detection strategies and allows dynamic registration and isolation of tenant-specific resources like databases, APIs, or any custom service.

## Features
- 🔍 **Composable tenant detection** via functional identifier strategies (e.g., `headerIdentifierStrategy`, `cookieIdentifierStrategy`)
- 🧩 **Register tenant-specific resources** (DB, Mailer, OpenAI, in-memory stores, etc.)
- ⚡ **Per-resource connection caching and expiration**
- 🧠 **Cache `resolveTenantConfig` results with expiration and manual reset**
- 🔁 **Access other resources inside a resource (composability)**
- 🧹 **Graceful connection cleanup with idle expiration**
- ✨ Written in **TypeScript** with full type safety and autocompletion
### Maybe/In future:
- 🔧 **Run migrations and seed per tenant or main database**
- 🌱 **Dynamically register tenants via API**
- 🪝 **Lifecycle hooks per resource**
- 📈 **Resources memory consumption**

> 💡 The plugin is **not tied to any specific database solution**. You can use it to manage connections to PostgreSQL, MySQL, Redis, file systems, third-party APIs, or in-memory resources like JavaScript `Map` instances.

## Installation
```sh
npm install @giogaspa/fastify-multitenant
```

## 🤖 How It Works

1. **Tenant Identifier Strategies** → figure out which tenant is making the request.
2. **Tenant Config Resolver** → fetches the tenant's configuration (like DB URL, API keys).
3. **Resource Factories** → use that configuration to create tenant-specific resources.

---

## 🔧 Full Example Configuration
```ts
import Fastify from 'fastify';
import multiTenantPlugin, {
  headerIdentifierStrategy,
  queryParamIdentifierStrategy,
  customIdentifierStrategy
} from '@giogaspa/fastify-multitenant';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

const fastify = Fastify();

fastify.register(multiTenantPlugin, {
  tenantIdentifierStrategies: [
    headerIdentifierStrategy('X-TENANT-ID'),
    queryParamIdentifierStrategy('tenant_id'),
    customIdentifierStrategy(req => req.cookies?.tenant_id)
  ],
  resolveTenantConfig: async (tenantId) => {
    return {
      id: tenantId,
      db_url: `postgres://localhost:5432/${tenantId}`,
      openaiKey: 'sk-xxx',
      mailerConfig: { from: 'support@example.com' }
    };
  },
  resolverCache: {
    enabled: true,
    expirationMs: 1000 * 60 * 10 // 10 minutes
  },
  resourceFactories: {
    db: {
      factory: async ({ config }) => new PrismaClient({ datasources: { db: { url: config.db_url } } }),
      cache: true,
      expirationMs: 1000 * 60 * 30
    },
    openai: async ({ config }) => new OpenAI({ apiKey: config.openaiKey }),
    mailer: async ({ config }) => createMailer(config.mailerConfig)
  }
});
```

---

## ⚙️ Plugin Options Reference

| Option                      | Type                                                       | Description                                                                 |
|-----------------------------|------------------------------------------------------------|-----------------------------------------------------------------------------|
| `tenantIdentifierStrategies` | `Array<IdentifierStrategy>`                                | Strategies to extract tenant ID from request                                |
| `resolveTenantConfig`      | `(tenantId: string) => Promise<TenantConfig>`              | Fetch tenant-specific configuration                                         |
| `resolverCache.enabled`    | `boolean`                                                  | Enable caching of resolved tenant configs                                   |
| `resolverCache.expirationMs` | `number`                                                  | Time-to-live for cached tenant config in milliseconds                       |
| `resourceFactories`        | `Record<string, ResourceFactory \| ResourceFactoryConfig>`  | Defines how to create tenant-specific services                              |

### `ResourceFactoryConfig`

| Property         | Type                                    | Description                                           |
|------------------|-----------------------------------------|-------------------------------------------------------|
| `factory`        | `(options: FactoryOptions) => Promise<any>` | Function that creates the resource                    |
| `cache`          | `boolean`                               | Whether to cache the resource (default: true)         |
| `expirationMs`   | `number`                                | TTL for idle resource cleanup                         |
| `hooks`          | `object`                                | Lifecycle hooks (`onCreated`, `onError`, `onExpired`) |

---

## 🤖 In deep explanation

...

---

## 🔍 Tenant Identifier Strategies (Step 1)
Tenant identification is configured using an array of detector functions. These are called in order until one returns a valid tenant ID.

### Built-in strategies
```ts
headerIdentifierStrategy(headerName: string): IdentifierStrategy
cookieIdentifierStrategy(cookieName: string): IdentifierStrategy
queryParamIdentifierStrategy(param: string): IdentifierStrategy
customIdentifierStrategy(fn: (req: FastifyRequest) => string | undefined): IdentifierStrategy
```

### Example:
```ts
tenantIdentifierStrategies: [
  headerIdentifierStrategy('X-TENANT-ID'),
  queryParamIdentifierStrategy('tenant_id'),
  customIdentifierStrategy((req) => req.headers['x-fallback-tenant'])
]
```

> ⚠️ Order matters. First match wins.

### Custom strategies
You can also write your own:
```ts
const myStrategy = () => (req) => req.headers['my-header'];
```

---

## 🔧 Tenant Config Resolver (Step 2)
After a tenant ID is detected, the plugin calls `resolveTenantConfig(tenantId)` to fetch **configuration** for that tenant.

### Purpose
The tenant config should include:
- Database connection string
- API keys (e.g., OpenAI, Stripe)
- Feature flags or environment settings

### Example
```ts
resolveTenantConfig: async (tenantId) => {
  return {
    id: tenantId,
    db_url: `postgres://.../${tenantId}`,
    openaiKey: 'sk-xxx',
    mailerConfig: { from: 'team@example.com' }
  }
}
```

This config is passed to all resource factories for that tenant.

### 🔁 Configuration caching
You can enable caching for resolved tenant configs:
```ts
resolverCache: {
  enabled: true,
  expirationMs: 1000 * 60 * 10 // 10 minutes
}
```

### 🔧 Programmatic reset
```ts
await fastify.invalidateTenantConfig('tenantId');
```

---

## 🔨 Resource Factories (Step 3)
Register one or more resources per tenant. Factories can reference other already-initialized resources (declared before them).

#### Factory Signature
```ts
({ tenantId, config, resources }) => Promise<any>
```
- `tenantId`: current tenant ID
- `config`: result of `resolveTenantConfig`
- `resources`: other initialized resources so far (in declaration order)

### Example
```ts
resourceFactories: {
  db: {
    factory: async ({ config }) => new PrismaClient({ ... }),
    cache: true,
    expirationMs: 1800000,
    hooks: {
      onCreated: ({ tenantId }) => { ... },
      onError: ({ tenantId, error }) => { ... },
      onExpired: ({ tenantId }) => { ... }
    }
  },
  mailer: {
    factory: async ({ config, resources }) => {
      const settings = await resources.db.settings.findFirst();
      return createMailer({ ...config.mailerConfig, from: settings.sender });
    }
  }
}
```

---

## Fastify Decorations

| Property         | Type          | Description                                    |
|-----------------|---------------|------------------------------------------------|
| `request.tenant` | `Record<string, any>` | Tenant-scoped resources for the current request |
| ~~`fastify.tenant`~~ | ~~`() => Record<string, any>`~~ | ~~Global accessor for tenant resources in current request~~ |
| ~~`fastify.invalidateTenantConfig(id)`~~ | ~~`Promise<void>`~~ | ~~Clears a cached tenant config for a given ID~~ |
| `fastify.tenants` | `{ get(id) => TenantResources, invalidate(id) => Promise<boolean>, ... }` | Get tenant resources ...|

## TypeScript: Declaration Merging

```ts
import 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { OpenAI } from 'openai';

declare module 'fastify' {
  interface FastifyRequest {
    tenant: {
      db: PrismaClient;
      openai: OpenAI;
    };
  }
}
```

## Advanced: Tenant Scoping Utility
Use resources outside of Fastify lifecycle:

```ts
import { getTenantResource } from '@giogaspa/fastify-multitenant';

const db = await getTenantResource('tenant1', 'db');
const users = await db.query('SELECT * FROM users');
```

## License
MIT
