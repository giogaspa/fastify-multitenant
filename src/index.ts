import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import fp from 'fastify-plugin'

import { BaseTenantConfig, BaseTenantId, FastifyMultitenantOptions, FastifyMultitenantRouteOptions } from './types.js'
import { TenantRequiredError } from './errors/TenantRequiredError.js'
import { TenantConfigurationNotFound } from './errors/TenantConfigurationNotFound.js'
import { TenantResourcesNotFound } from './errors/TenantResourcesNotFound.js'
import { TenantResourceCreateError } from './errors/TenantResourceCreateError.js'
import { TenantConfigResolver, tenantConfigResolverFactory } from './tenant-config-resolver.js'
import { TenantResourceResolver, tenantResourceResolverFactory } from './tenant-resource-resolver.js'
import { identifyTenantFactory } from './tenant-identification.js'
import { TenantResourcesAsyncLocalStorage } from './request-context.js'

export { FastifyMultitenantOptions, ResourceFactoryConfig, IdentifierStrategy } from './types.js'
export { IdentifierStrategyFactory } from './strategies/types.js'
export { headerIdentifierStrategy } from './strategies/header-identifier-strategy.js'
export { queryIdentifierStrategy } from './strategies/query-identifier-strategy.js'
export { tenantResourcesContext } from './request-context.js'

declare module "fastify" {
    interface FastifyInstance {
        tenants: {
            config: TenantConfigResolver<BaseTenantId, BaseTenantConfig>
            resources: TenantResourceResolver<BaseTenantId>
        }
    }
}

const fastifyMultitenant: FastifyPluginAsync<FastifyMultitenantOptions<any>> = async (fastify, opts) => {
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

    fastify.decorateRequest('tenant', null)

    fastify.addHook('onRequest', function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
        if (isExcludedRoute(request)) {
            //this.log.debug('Route is excluded from multitenancy')
            done()
            return
        }

        // IDENTIFY TENANT
        identifyTenant(request)
            .then(tenantId => {
                if (!tenantId) {
                    done(new TenantRequiredError)
                    return
                }

                // RESOLVE TENANT CONFIG
                configResolver
                    .get(tenantId)
                    .then(tenantConfig => {
                        if (!tenantConfig) {
                            done(new TenantConfigurationNotFound(tenantId))
                            return
                        }

                        // RESOLVE TENANT RESOURCES
                        resourceResolver
                            .getAll(tenantId)
                            .then(tenantResources => {
                                if (!tenantResources) {
                                    done(new TenantResourcesNotFound(tenantId))
                                    return
                                }

                                //@ts-ignore
                                request.tenant = tenantResources

                                TenantResourcesAsyncLocalStorage.run(tenantResources, done)
                            })
                            .catch((error) => done(new TenantResourceCreateError(tenantId, error && 'message' in error && error.message)))
                    })
                    .catch(() => done(new TenantConfigurationNotFound(tenantId)))
            })
            .catch(() => done(new TenantRequiredError))
    })
}

export default fp(fastifyMultitenant, {
    fastify: '5.x',
    name: '@giogaspa/fastify-multitenant'
})

function isExcludedRoute(request: FastifyRequest) {
    const { routeOptions } = request as FastifyRequest & { routeOptions: FastifyMultitenantRouteOptions }

    return routeOptions?.config?.fastifyMultitenant?.exclude === true
}