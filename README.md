# Fastify Multi-Tenancy Plugin

A flexible multi-tenancy plugin for Fastify, written in **TypeScript**. It supports multiple tenant detection strategies and allows dynamic registration and isolation of tenant-specific resources like databases, APIs, or any custom service.

Examples:

- [Playground](playground/README.md) (sqlite)

## Features

### Done

- 🔍 **Composable tenant detection** via identifier strategies (e.g., `headerIdentifierStrategy`, `queryIdentifierStrategy`, `cookieIdentifierStrategy`,...)
- 🧩 **Register tenant-specific resources** (DB, Mailer, OpenAI, in-memory stores, etc.)
- 🔁 **Access other resources inside a resource factory**
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

## Install

```sh
npm install @giogaspa/fastify-multitenant
```

### Compatibility

| Plugin version | Fastify version |
| ---------------|-----------------|
| `>=1.x`        | `^5.x`          |
| `^0.x`         | `^4.x`          |

## 🤖 How It Works

1. **Tenant Identifier Strategies** → figure out which tenant is making the request.
2. **Tenant Config Resolver** → fetches the tenant's configuration (like DB URL, API keys,...).
3. **Resources Factories** → use that configuration to create tenant-specific resources and cache them.

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

// Define custom tenant config TS type
type TenantConfigType = {
    id: string
    name: string
    dbConnectionUrl: string
}

// Define custom tenant resources TS type
type TenantResourcesType = {
    db: TenantDatabase
    greeting: GreetingsClient
}

// In this example we used a Map for simplicity, but you can manage the configurations however you prefer.
// Check the Playground folder for an example based on SQLite and Drizzle ORM.
const tenantConfigs = new Map<string, TenantConfig>()

export const app: FastifyPluginAsync = async function App(server: FastifyInstance) {

    const options: FastifyMultitenantOptions<TenantConfigType, TenantResourcesType> = {
        tenantIdentifierStrategies: [
            headerIdentifierStrategy('X-TENANT-ID'),
            pathPrefixIdentifierStrategy(),
            userCustomIdentifierStrategy(),
        ],
        tenantConfigResolver: async (tenantId) => {
            return tenantConfigs.get(tenantId)
        },
        resources: {
            // You can use the `createTenantResourceConfig` helper to create the configuration...
            ...createTenantResourceConfig({
                name: 'db',
                factory: async ({ tenantConfig }) => {
                    const dbClient = createTenantClient({ url: tenantConfig.dbConnectionUrl })

                    return dbClient
                },
                onDelete: async (resource) => {
                    // Here you can perform any cleanup if needed
                    server.log.debug(`[${resource}]: Deleting db resource`)
                }
            }),
            // ... or you can directly define the configuration object as specified by the type `TenantResourceFactory`
            'greeting': async ({ config, resources }: ResourceFactoryConfig<TenantConfig>) => {
                const tenantGreetings = await resources.db!.greetings.findMany()

                const greetingsClient = greetingFactory(config.id, tenantGreetings)

                return greetingsClient
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
| `tenantIdentifierStrategies` | `Array<IdentifierStrategy>`                                | Strategies to extract tenant ID from request. |
| `tenantConfigResolver`      | `TenantConfigResolver<TenantConfig>`              | Fetch tenant-specific configuration. |
| `resources`        | `TenantResourceConfigs<TenantConfig, TenantResources>`  | Defines how to create tenant-specific resources. |

### `TenantResourceConfig<TenantConfig, TenantResources, Resource>`

| Property         | Type                                    | Description                                           |
|------------------|-----------------------------------------|-------------------------------------------------------|
| `factory`        | `TenantResourceFactory<TenantConfig, TenantResources, ResourceType>` | Function that create the resource. |
| `onDelete?`        | `TenantResourceOnDeleteHook<ResourceType>` | Function that runs before a resource is deleted by resources provider. Here you can perform any cleanup if needed, es: close DB connection,... |
| ~~`cacheTtl?`~~          | ~~`number`~~                               | ~~TTL for idle resource cleanup (default=-1).~~         |

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

### 🔧 Programmatic reset of tenants configuration cache

```ts
await fastify.multitenant.configProvider.invalidate('tenantId');
await fastify.multitenant.configProvider.invalidateAll();
```

---

## 🔨 Resource Factories (Step 3)

Register one or more resources per tenant. Factories can reference other already-initialized resources (declared before them).

### Factory Signature

```ts
(args: { tenantConfig: TenantConfig, resources: Partial<TenantResources>}) => Promise<Resource>
```

- `tenantConfig`: result of `resolveTenantConfig(tenantId)`
- `resources`: other initialized resources so far (in declaration order)

### Example

```ts
resources: {
  db: {
    factory: async ({ config }) => new PrismaClient({ ... }),
  },
  mailer: async ({ tenantConfig, resources }) => {
      const settings = await resources.db.settings.findFirst();
      return createMailer({ ...config.mailerConfig, from: settings.sender });
  }
}
```

---

## Fastify Decorators

| Property         | Type          | Description                                    |
|-----------------|---------------|------------------------------------------------|
| `request.tenant` | `Record<string, Resources>` | Tenant-scoped resources for the current request. |
| `fastify.multitenant.resourceProvider.createAll` | `(tenantId: TenantId) => Promise<TenantResources \| undefined>` | ... |
| `fastify.multitenant.resourceProvider.getAll` | `(tenantId: TenantId) => Promise<TenantResources \| undefined>` | ... |
| `fastify.multitenant.resourceProvider.invalidate` | `(tenantId: TenantId) => Promise<void>` | ... |
| `fastify.multitenant.resourceProvider.invalidateAll` | `() => Promise<void>` | ... |
| `fastify.multitenant.configProvider.get` | `(tenantId: TenantId) => Promise<TenantConfig \| undefined>` | ... |
| `fastify.multitenant.configProvider.invalidate` | `(tenantId: TenantId) => Promise<void>` | Invalidate the cached configuration for a specific tenant. |
| `fastify.multitenant.configProvider.invalidateAll` | `() => Promise<void>` | Invalidate all cached tenant configurations. |

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

## Advanced: Tenant resources context

Get resources from `tenantResourcesContext` context:

| Method         | Type          | Description                                    |
|-----------------|---------------|------------------------------------------------|
| `tenantResourcesContext.get` | `(key: ResourceName) => unknown` | Tenant-scoped resource for the current request |
| `tenantResourcesContext.getAll` | `() => TenantResourcesStore \| undefined` | Tenant-scoped resources for the current request |

Example:

```ts
import { tenantResourcesContext } from '@giogaspa/fastify-multitenant'

async function getUsers() {
    const db = tenantResourcesContext.get('db'); // Specify resource name
    const users = await db.query('SELECT * FROM users');

    return users;
}

...

fastify.get('/users', async () => {
    return getUsers()
})


const allTenantResources = tenantResourcesContext.getAll();

```

## License

MIT
