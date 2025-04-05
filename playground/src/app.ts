import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyMultitenant, { headerIdentifierStrategy, FastifyMultitenantOptions, queryIdentifierStrategy, ResourceFactoryConfig } from '@giogaspa/fastify-multitenant'


declare module "fastify" {
    interface FastifyInstance {
    }

    interface FastifyRequest {
        tenant: {
            resource1: {
                greeting: () => string
            }
            resource2: {
                greeting: () => string
                set: (key: string, value: string) => void
                getAll: () => IterableIterator<string>
            }
        }
    }
}

type TenantConfig = {
    id: string
    name: string
    dbConnectionURL: string
}

const inMemoryTenantMapper = new Map<string, TenantConfig>()
inMemoryTenantMapper.set('tenant1', { id: 'tenant1', name: 'Tenant 1', dbConnectionURL: 'mongodb://localhost:27017/tenant1' })
inMemoryTenantMapper.set('tenant2', { id: 'tenant2', name: 'Tenant 2', dbConnectionURL: 'mongodb://localhost:27017/tenant2' })
inMemoryTenantMapper.set('tenant3', { id: 'tenant3', name: 'Tenant 3', dbConnectionURL: 'mongodb://localhost:27017/tenant3' })

export const app: FastifyPluginAsync = async function App(server: FastifyInstance) {

    const options: FastifyMultitenantOptions<TenantConfig> = {
        tenantIdentifierStrategies: [
            headerIdentifierStrategy('X-TENANT-ID'),
            queryIdentifierStrategy('tenantId'),
        ],
        resolveTenantConfig: async (tenantId: string) => {
            const config = inMemoryTenantMapper.get(tenantId)

            return config
        },
        resourceFactories: {
            'resource1': async ({ config, resources }: ResourceFactoryConfig<TenantConfig>) => {
                console.log('Creating resource1 for tenant:', config)
                console.log('Resources:', resources)

                return {
                    greeting: () => `Tenant ${config.id}: Hello world!`,
                }
            },
            'resource2': {
                factory: async ({ config, resources }: ResourceFactoryConfig<TenantConfig>) => {
                    console.log('Creating resource2 for tenant:', config)
                    console.log('Resources:', resources)

                    const map = new Map<string, string>()
                    map.set('key1', 'value1')
                    map.set('key2', 'value2')
                    map.set('key3', 'value3')

                    return {
                        greeting: () => `Tenant ${config.id}: Hello world!`,
                        set: (key: string, value: string) => map.set(key, value),
                        getAll: () => map.values()
                    }
                },
                cache: true,
                ttl: 60,
            },
            'resource3': async ({ config, resources }: ResourceFactoryConfig<TenantConfig>) => {
                console.log('Creating resource3 for tenant:', config)
                console.log('Resources:', resources)

                return {
                    greeting: () => `Tenant ${config.id}: Hello world!`,
                }
            },
        }
    }

    await server.register(fastifyMultitenant, options)

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

    server.get('/', async (request, reply) => {
        console.log('Requesting tenant:', request.tenant)

        return {
            greeting1: request.tenant.resource1.greeting(),
            greeting2: request.tenant.resource2.greeting(),
            values: [...request.tenant.resource2.getAll()]
        }
    })
}