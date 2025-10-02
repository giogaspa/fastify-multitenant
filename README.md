# Fastify Multi-Tenancy Plugin v1

A flexible multi-tenancy plugin for Fastify that simplifies building multi-tenant applications by handling tenant detection, configuration, and resource isolation.

Examples:

- [Playground](playground/README.md) (sqlite)


## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#-how-it-works)
- [Tenant Identification](#tenant-identification)
- [Configuration Resolution](#configuration-resolution)
- [Resource Initialization](#resource-initialization)
- [Plugin Options](#plugin-options)
- [Plugin Decorators](#plugin-decorators)
- [TypeScript: Declaration Merging](#typescript-declaration-merging)
- [Advanced: Tenant Resources Context](#advanced-tenant-resources-context)
- [Performance Considerations](#performance-considerations)
- [License](#license)


## Features

### Done

- 🔍 **Composable tenant detection** via identifier strategies (e.g., `headerIdentifierStrategy`, `queryIdentifierStrategy`, `cookieIdentifierStrategy`,...)
- 🧩 **Register tenant-specific resources** (DB, Mailer, OpenAI, in-memory stores, etc.)
- 🔁 **Access other tenant resources inside a resource factory**
- ✨ Written in **TypeScript** with full type safety and autocompletion

### In progress

- ⚡ **Cache tenant configs and tenant resources with expiration and manual reset**
- 🪝 **Lifecycle hooks per resource**

### In future/Maybe

- 📈 **Resources memory consumption**

> 💡 The plugin is **not tied to any specific database or ORM**.


## Installation

```sh
npm install @giogaspa/fastify-multitenant
```


### Compatibility

| Plugin version | Fastify version |
| ---------------|-----------------|
| `>=1.x`        | `^5.x`          |
| `^0.x`         | `^4.x`          |


## Quick Start

```ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyMultitenant, { headerIdentifierStrategy, FastifyMultitenantOptions, ResourceFactoryConfig } from '@giogaspa/fastify-multitenant'

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


## How It Works

This plugin operates in a three-step process to manage multi-tenancy:

1. **Tenant Identification** - Detects which tenant is making the request using configurable strategies
2. **Configuration Resolution** - Retrieves tenant-specific configuration data (connection strings, API keys, etc.)
3. **Resource Initialization** - Creates and caches tenant-specific resources based on the configuration


## Tenant Identification

The plugin uses composable strategies to identify which tenant is making a request. You can configure multiple strategies that will be executed in sequence until one returns a valid tenant ID.
By default, identification strategies are executed during the `onRequest` [hook](https://fastify.dev/docs/latest/Reference/Hooks/#onrequest), but you can configure which hook to use with the `hook` option.

### Built-in strategies

```ts
headerIdentifierStrategy(headerName: string): IdentifierStrategy
cookieIdentifierStrategy(cookieName: string): IdentifierStrategy
queryParamIdentifierStrategy(param: string): IdentifierStrategy
```

Example:

```ts
tenantIdentifierStrategies: [
  headerIdentifierStrategy('X-TENANT-ID'),
  queryParamIdentifierStrategy('tenant_id'),
]
```

> ⚠️ Order matters. First match wins.

### Custom strategies

You can also write your own:

```ts
const myStrategy = () => (req) => req.headers['my-header'];
```


## Configuration Resolution

After identifying the tenant ID through the configured strategies, the plugin invokes your `tenantConfigResolver` function to retrieve tenant-specific configuration data. This configuration serves as the foundation for initializing tenant-specific resources.

### Purpose

The tenant configuration object should include information needed by the resource factories, e.g.:

- Database connection string,
- API keys (e.g., OpenAI, Stripe,...),
- Feature flags or environment settings,
- etc.

Example:

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

This configuration is retrieved once per tenant and then passed to all resource factories for that tenant, serving as the foundation for initializing tenant-specific resources such as databases, APIs, or services.

### Clearing tenant configuration cache programmatically

```ts
await fastify.multitenant.configProvider.invalidate('tenantId');
await fastify.multitenant.configProvider.invalidateAll();
```


## Resource Initialization

The plugin allows you to define and initialize tenant-specific resources (like databases, API clients, or services) that are automatically managed based on tenant context. Each resource is:

1. Created on-demand when first needed
2. Cached for subsequent requests to the same tenant
3. Isolated between different tenants

Resources are defined as a collection of factory functions that can depend on previously initialized resources, creating a dependency chain.

### Factory function signature

```ts
(args: { tenantConfig: TenantConfig, resources: Partial<TenantResources>}) => Promise<Resource>
```

- `tenantConfig`: result of `resolveTenantConfig(tenantId)`
- `resources`: other initialized resources so far (in declaration order)

Example:

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


## Plugin Options

| Option                      | Type                                                       | Description                                                                 |
|-----------------------------|------------------------------------------------------------|-----------------------------------------------------------------------------|
| `tenantIdentifierStrategies` | `Array<IdentifierStrategy>`                                | Strategies to extract tenant ID from request. |
| `tenantConfigResolver`      | `TenantConfigResolver<TenantConfig>`              | Fetch tenant-specific configuration. |
| `resources`        | `TenantResourceConfigs<TenantConfig, TenantResources>`  | Defines how to create tenant-specific resources. |
| `hook` | `'onRequest' \| 'preParsing' \| 'preValidation' \| 'preHandler'` | Define in which lifecycle hook the current tenant is identified and its resources resolved. Default `onRequest` |

### `TenantResourceConfig<TenantConfig, TenantResources, Resource>`

This type defines how to create and manage tenant-specific resources:

| Property         | Type                                    | Description                                           |
|------------------|-----------------------------------------|-------------------------------------------------------|
| `factory`        | `TenantResourceFactory<TenantConfig, TenantResources, ResourceType>` | Function that create the resource. |
| `onDelete?`        | `TenantResourceOnDeleteHook<ResourceType>` | Function that runs before a resource is deleted by resources provider. Here you can perform any cleanup if needed, es: close DB connection,... |

---

## Plugin Decorators

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

## Advanced: Tenant Resources Context

Access tenant resources from anywhere in your code using the async local storage-based context:

| Method | Type | Description |
|--------|------|-------------|
| `tenantResourcesContext.get(key)` | `(key: ResourceName) => unknown` | Retrieves a specific tenant resource for the current request |
| `tenantResourcesContext.getAll()` | `() => TenantResourcesStore \| undefined` | Gets all tenant resources for the current request |

Example:

```ts
import { tenantResourcesContext } from '@giogaspa/fastify-multitenant'

// This function can be called from anywhere in your application code
// and will have access to the current tenant's resources
async function getUsers() {
    const db = tenantResourcesContext.get('db');
    return await db.query('SELECT * FROM users');
}

// Use in a route handler
fastify.get('/users', async () => {
    return getUsers();
})

// Get all resources at once
fastify.get('/tenant-info', async () => {
    const resources = tenantResourcesContext.getAll();
    return {
        dbStatus: await resources.db.status(),
        apiConnected: resources.api.isConnected()
    };
})
```

> **Note**: The tenant resources context is tied to the request lifecycle. Make sure you're accessing it within the scope of a request.


## Performance Considerations

- The plugin caches tenant configurations and resources to minimize overhead
- Resources are created on-demand and cached for subsequent requests


## License

MIT
