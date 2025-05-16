# Fastify Multi-Tenancy Plugin

A flexible multi-tenancy plugin for Fastify, written in **TypeScript**. It supports multiple tenant detection strategies and allows dynamic registration and isolation of tenant-specific resources like databases, APIs, or any custom service.

Examples:
- [Playground](playground/README.md) (sqlite)

## Features

### Done

- 🔍 **Composable tenant detection** via identifier strategies (e.g., `headerIdentifierStrategy`, `queryIdentifierStrategy`, `cookieIdentifierStrategy`,...)
- 🧩 **Register tenant-specific resources** (DB, Mailer, OpenAI, in-memory stores, etc.)
- 🔁 **Access other resources inside a resource**
- ✨ Written in **TypeScript** with full type safety and autocompletion

### In progress

- ⚡ **Per-resource caching and expiration**
- 🧠 **Cache `resolveTenantConfig` results with expiration and manual reset**
- 🧹 **Graceful connection cleanup with idle expiration**
- 🪝 **Lifecycle hooks per resource**

### In future/Maybe

- 🔧 **Run migrations and seed per tenant or main database**
- 🌱 **Dynamically register tenants via API**
- 📈 **Resources memory consumption**

> 💡 The plugin is **not tied to any specific database or ORM**.

## Installation

```sh
npm install @giogaspa/fastify-multitenant
```

## 🤖 How It Works

1. **Tenant Identifier Strategies** → figure out which tenant is making the request.
2. **Tenant Config Resolver** → fetches the tenant's configuration (like DB URL, API keys,...).
3. **Resource Factories** → use that configuration to create tenant-specific resources and cache them.

---

## 🔧 Full Example Configuration

```ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyMultitenant, { headerIdentifierStrategy, FastifyMultitenantOptions, queryIdentifierStrategy, ResourceFactoryConfig } from '@giogaspa/fastify-multitenant'

declare module "fastify" {
    interface FastifyRequest {
        tenant: {
            db: TenantDatabase
            greeting: GreetingsClient
        }
    }
}

export const app: FastifyPluginAsync = async function App(server: FastifyInstance) {

    const options: FastifyMultitenantOptions<TenantConfig> = {
        tenantIdentifierStrategies: [
            headerIdentifierStrategy('X-TENANT-ID'),
            pathPrefixIdentifierStrategy(),
            userCustomIdentifierStrategy(),
        ],
        tenantConfigResolver: async (tenantId: string) => {
            return tenantConfigs.get(tenantId)
        },
        resourceFactories: {
            'db': async ({ config }: ResourceFactoryConfig<TenantConfig>) => {
                const dbClient = createTenantClient({ url: config.db })
                return dbClient
            },
            'greeting': {
                factory: async ({ config, resources }: ResourceFactoryConfig<TenantConfig>) => {
                    const tenantDb: TenantDatabase = resources.db
                    const tenantGreetings = await tenantDb.greetings.findMany()
                    const greetingsClient = greetingFactory(config.id, tenantGreetings)

                    return greetingsClient
                },
                cacheTtl: 60, // 1 minute
            },
        }
    }

    await server.register(fastifyMultitenant, options)

    // Example of a tenant's route that uses the tenant greeting service
    server.get('/greetings', async (request) => {
        return {
            greeting: request.tenant.greeting(),
        }
    })

    // Example of a route that is excluded from multitenancy
    server.get(
        '/no-tenant',
        {
            config: {
                fastifyMultitenant: {
                    exclude: true
                }
            }
        },
        async (request, reply) => {
            return { msg: 'No tenant route' }
        }
    )
}
```

---

## ⚙️ Plugin Options Reference

| Option                      | Type                                                       | Description                                                                 |
|-----------------------------|------------------------------------------------------------|-----------------------------------------------------------------------------|
| `tenantIdentifierStrategies` | `Array<IdentifierStrategy>`                                | Strategies to extract tenant ID from request                                |
| `tenantConfigResolver`      | `ConfigResolver<TenantConfig>`              | Fetch tenant-specific configuration                                         |
| `resourceFactories`        | `ResourceFactories<TenantConfig>`  | Defines how to create tenant-specific services                              |

### `ResourceFactory<TenantConfig>`

| Property         | Type                                    | Description                                           |
|------------------|-----------------------------------------|-------------------------------------------------------|
| `factory`        | `(config: ResourceFactoryConfig<TenantConfig>) => any \| Promise<any>` | Function that creates the resource                    |
| `cacheTtl?`          | `number`                               | TTL for idle resource cleanup (default=-1)         |
| ~~`hooks`~~        | ~~`object`~~                                | ~~Lifecycle hooks (`onCreated`, `onError`, `onExpired`)~~ |

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

### Example

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

After a tenant ID is detected, the plugin calls the tenant configuration resolver to fetch **configuration** for that tenant.

### Purpose

The tenant configuration object should include information needed by the resources factory, e.g.:

- Database connection string,
- API keys (e.g., OpenAI, Stripe,...),
- Feature flags or environment settings,
- etc.

### Example

```ts
tenantConfigResolver: async (tenantId) => {
  ...

  return {
    id: tenantId,
    db_url: `postgres://.../${tenantId}`,
    openaiKey: 'sk-xxx',
    mailerConfig: { from: 'team@example.com' }
  }
}
```

This configuration is passed to all resource factories for that tenant.

### 🔧 Programmatic reset of tenant configuration cache

```ts
await fastify.tenant.invalidateConf('tenantId');
await fastify.tenant.invalidateAllConf();
```

---

## 🔨 Resource Factories (Step 3)

Register one or more resources per tenant. Factories can reference other already-initialized resources (declared before them).

### Factory Signature

```ts
(config: ResourceFactoryConfig<TenantConfig>) => any | Promise<any>
```

- `config`: result of `resolveTenantConfig(tenantId)`
- `resources`: other initialized resources so far (in declaration order)

### Example

```ts
resourceFactories: {
  db: {
    factory: async ({ config }) => new PrismaClient({ ... }),
    cacheTtl: 1800000,
  },
  mailer: async ({ config, resources }) => {
      const settings = await resources.db.settings.findFirst();
      return createMailer({ ...config.mailerConfig, from: settings.sender });
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
| ~~`fastify.tenants`~~ | ~~`{ get(id) => TenantResources, invalidate(id) => Promise<boolean>, ... }`~~ | ~~Get tenant resources ...~~|

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
