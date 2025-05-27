import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyMultitenant, { headerIdentifierStrategy, FastifyMultitenantOptions, queryIdentifierStrategy, ResourceFactoryConfig } from '@giogaspa/fastify-multitenant'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client';

import { AdminSchema, AdminDatabaseType } from '../schemas/admin.schema.js'
import { TenantSchema, TenantDatabaseType } from '../schemas/tenant.schema.js';
import { GreetingModule } from './modules/greeting/index.js';
import { ProductModule } from './modules/product/index.js';

declare module "fastify" {
    interface FastifyInstance {
        adminDB: AdminDatabaseType
    }

    interface FastifyRequest {
        tenant: {
            db: TenantDatabaseType
        }
    }
}

type TenantConfig = {
    id: string
    name: string
    db: string
}

export const app: FastifyPluginAsync = async function App(server: FastifyInstance) {

    const adminDBClient = createClient({ url: 'file:./data/admin.db' })
    const adminDB: AdminDatabaseType = drizzle(adminDBClient, { schema: AdminSchema })
    server.decorate('adminDB', adminDB)

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
            }
        }
    }

    // Register plugins
    server.register(fastifyMultitenant, options)

    // Register modules
    server.register(GreetingModule)
    server.register(ProductModule)

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