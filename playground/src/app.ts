import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyMultitenant, { headerIdentifierStrategy, FastifyMultitenantOptions, queryIdentifierStrategy, ResourceFactoryConfig } from '@giogaspa/fastify-multitenant'

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client';

import { AdminSchema, AdminDatabaseType } from '../schemas/admin.schema.js'
import { TenantSchema, TenantDatabaseType } from '../schemas/tenant.schema.js';

declare module "fastify" {
    interface FastifyInstance {
    }

    interface FastifyRequest {
        tenant: {
            db: TenantDatabaseType
            greeting: GreetingsClient
        }
    }
}

export const app: FastifyPluginAsync = async function App(server: FastifyInstance) {

    const adminDBClient = createClient({ url: 'file:./data/admin.db' })
    const adminDB: AdminDatabaseType = drizzle(adminDBClient, { schema: AdminSchema })

    const options: FastifyMultitenantOptions<TenantConfig> = {
        tenantIdentifierStrategies: [
            headerIdentifierStrategy('X-TENANT-ID'),
            queryIdentifierStrategy('tenantId'),
        ],
        tenantConfigResolver: async (tenantId: string) => {
            server.log.debug(`[${tenantId}]: Resolving tenant config`)
            // In this example, we are using a SQLite database to store the tenant configuration,
            // but you can use any other data source (e.g., a file, an object, .env, etc.)
            return adminDB.query.tenantsConfig.findFirst({ where: eq(AdminSchema.tenantsConfig.id, tenantId) })
        },
        resourceFactories: {
            'db': async ({ config }: ResourceFactoryConfig<TenantConfig>) => {
                server.log.debug(`[${config.id}]: Creating db client`)

                const client = createClient({ url: config.db })
                const db: TenantDatabaseType = drizzle(client, { schema: TenantSchema })
                return db
            },
            'greeting': {
                factory: async ({ config, resources }: ResourceFactoryConfig<TenantConfig>) => {
                    server.log.debug(`[${config.id}]: Creating greeting client`)

                    const tenantDb = resources.db as TenantDatabaseType
                    const tenantGreetings = await tenantDb.query.greetings.findMany()
                    const greetingsClient = greetingFactory(config.id, tenantGreetings.map(g => g.greeting))

                    return greetingsClient
                },
                cacheTtl: 60, // 1 minute
            },
        }
    }

    await server.register(fastifyMultitenant, options)

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

    // Example of a tenant route that uses the tenant database
    server.get('/greetings', async (request) => {
        return {
            greeting: request.tenant.greeting(),
        }
    })

    // Example of a tenant route that uses the tenant database
    server.get('/products', async (request) => {
        const products = await request.tenant.db.query.products.findMany()

        return products
    })
}

type TenantConfig = {
    id: string
    name: string
    db: string
}

// TODO: Move to a separate file
type GreetingsClient = ReturnType<typeof greetingFactory>
function greetingFactory(prefix: string, greetings: string[]) {
    return () => {
        const greeting = greetings[Math.floor(Math.random() * greetings.length)]

        return `[${prefix}]: ${greeting}`
    }
}