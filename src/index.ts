import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { BaseTenantConfig, BaseTenantId, FastifyMultitenantOptions, FastifyMultitenantRouteOptions, IdentifierStrategy, ResourceFactory } from './types.js'
import { TenantRequiredError } from './errors/TenantRequiredError.js'
import { TenantConfigurationNotFound } from './errors/TenantConfigurationNotFound.js'
import { TenantResourceNotFound } from './errors/TenantResourceNotFound.js'
import { TenantConfigResolver, tenantConfigResolverFactory } from './tenant-config-resolver.js'
import { TenantResourceResolver, tenantResourceResolverFactory } from './tenant-resource-resolver.js'
import { identifyTenantFactory } from './tenant-identification.js'
export { FastifyMultitenantOptions, ResourceFactoryConfig } from './types.js'
export { headerIdentifierStrategy } from './strategies/header-identifier-strategy.js'
export { queryIdentifierStrategy } from './strategies/query-identifier-strategy.js'

declare module "fastify" {
    interface FastifyInstance {
        tenants: {
            config: TenantConfigResolver<BaseTenantId, BaseTenantConfig>
            resources: TenantResourceResolver<BaseTenantId>
        }
    }
}

const plugin: FastifyPluginAsync<FastifyMultitenantOptions<any>> = async (fastify, opts) => {
    const identifyTenant = identifyTenantFactory(opts.tenantIdentifierStrategies)
    const configResolver = tenantConfigResolverFactory(opts.tenantConfigResolver)
    const resourceResolver = tenantResourceResolverFactory(opts.resourceFactories, configResolver)

    fastify.decorate(
        'tenants',
        {
            config: configResolver,
            resources: resourceResolver
        }
    )

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
            //this.log.debug('No tenant identified');
            throw new TenantRequiredError()
        }

        // RESOLVE TENANT CONFIG
        const tenantConfig = await configResolver.get(tenantId)

        if (!tenantConfig) {
            //this.log.debug('No tenant config found')
            throw new TenantConfigurationNotFound()
        }

        // RESOLVE TENANT RESOURCES
        const tenantResources = await resourceResolver.getAll(tenantId)

        if (!tenantResources) {
            //this.log.debug('No tenant resources found')
            throw new TenantResourceNotFound()
        }

        //@ts-ignore
        request.tenant = tenantResources
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