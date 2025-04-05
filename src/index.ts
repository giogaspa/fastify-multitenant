import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { BaseTenantConfig, BaseTenantId, FastifyMultitenantOptions, FastifyMultitenantRouteOptions, IdentifierStrategy, ResourceFactory } from './types.js'
import { TenantRequiredError } from './errors/TenantRequiredError.js'
import { TenantConfigurationError } from './errors/TenantConfigurationError.js'

export { FastifyMultitenantOptions, ResourceFactoryConfig } from './types.js'
export { headerIdentifierStrategy } from './strategies/header-identifier-strategy.js'
export { queryIdentifierStrategy } from './strategies/query-identifier-strategy.js'

declare module "fastify" {
    interface FastifyInstance {
    }
}

const plugin: FastifyPluginAsync<FastifyMultitenantOptions<any>> = async (fastify, opts) => {
    const identifyTenant = identifyTenantFactory(opts.tenantIdentifierStrategies)
    // TODO: only for testing
    const inMemoryTenantResources: Record<string, Record<string, any>> = {}

    fastify.decorateRequest('tenant', undefined)

    fastify.addHook('onRequest', async function (this: FastifyInstance, request: FastifyRequest) {
        if (isExcludedRoute(request)) {
            //this.log.debug('Route is excluded from multitenancy')
            return
        }

        // IDENTIFY TENANT
        //this.log.debug('Identifying tenant...')
        const tenantId = await identifyTenant(request)

        if (!tenantId) {
            this.log.debug('No tenant identified');
            throw new TenantRequiredError()
        }

        // RESOLVE TENANT CONFIG
        // TODO: cache tenant config
        const tenantConfig = await opts.resolveTenantConfig(tenantId)

        if (!tenantConfig) {
            this.log.debug('No tenant config found')
            throw new TenantConfigurationError()
        }

        // CREATE RESOURCES
        // TODO: cache resources with TTL
        if (!inMemoryTenantResources[tenantId]) {
            console.log('Creating resources for tenant:', tenantId)
            inMemoryTenantResources[tenantId] = await getResources(tenantConfig, opts.resourceFactories)
        }
        const tenantResources = inMemoryTenantResources[tenantId]

        //@ts-ignore
        request.tenant = tenantResources

        // ATTACH TENANT CONFIG AND RESOURCES TO REQUEST

    })
}

export default fp(plugin, {
    fastify: '5.x',
    name: '@giogaspa/fastify-multitenant'
})

function isExcludedRoute(request: FastifyRequest) {
    const { routeOptions } = request as FastifyRequest & { routeOptions: FastifyMultitenantRouteOptions }

    return routeOptions?.config?.fastifyMultitenant?.exclude === true
}

function identifyTenantFactory(strategies: IdentifierStrategy[]) {
    if (!strategies || strategies.length === 0) {
        return async () => undefined
    }

    return async function identifyTenant(request: FastifyRequest): Promise<BaseTenantId | undefined> {
        let tenantId: BaseTenantId | undefined = undefined

        for (const strategyFn of strategies) {
            tenantId = await strategyFn(request)
            if (tenantId) {
                break // Exit the loop if a tenant ID is found
            }
        }

        return tenantId
    }
}

// Draft implementation of resource factories
// TODO: implement caching and TTL
async function getResources<TenantConfig extends BaseTenantConfig>(tenantConfig: TenantConfig, resourceFactories: Record<string, ResourceFactory<TenantConfig>>) {
    const resources: Record<string, any> = {}

    for (const [name, factory] of Object.entries(resourceFactories)) {
        if (typeof factory === 'function') {
            resources[name] = await factory({ config: tenantConfig, resources })
        } else if (typeof factory.factory === 'function') {
            const { factory: resourceFactory, cache, ttl } = factory
            resources[name] = await resourceFactory({ config: tenantConfig, resources })
        }
    }

    return resources
}