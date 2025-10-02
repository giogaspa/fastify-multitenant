import { FastifyInstance, FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import fp from 'fastify-plugin'

import { BaseTenantConfig, BaseTenantResources, FastifyMultitenantOptions, FastifyMultitenantRouteOptions, ResourceName, TenantConfigProvider, TenantResourcesProvider } from './types.js'
import { TenantRequiredError } from './errors/TenantRequiredError.js'
import { TenantConfigurationNotFound } from './errors/TenantConfigurationNotFound.js'
import { TenantResourcesNotFound } from './errors/TenantResourcesNotFound.js'
import { TenantResourceCreateError } from './errors/TenantResourceCreateError.js'
import { tenantConfigProviderFactory } from './providers/tenant-config-provider.js'
import { tenantResourceProviderFactory } from './providers/tenant-resource-provider.js'
import { identifyTenantFactory } from './tenant-identification.js'
import { TenantResourcesAsyncLocalStorage } from './request-context.js'

export { FastifyMultitenantOptions, TenantResourceFactory, TenantResourceConfig, TenantResourceConfigs, IdentifierStrategy, TenantConfigResolver, TenantResourceOnDeleteHook, TenantId } from './types.js'
export { IdentifierStrategyFactory } from './strategies/types.js'
export { headerIdentifierStrategy } from './strategies/header-identifier-strategy.js'
export { queryIdentifierStrategy } from './strategies/query-identifier-strategy.js'
export { tenantResourcesContext } from './request-context.js'
export { createTenantResourceConfig, CreateTenantResourceConfigArgs } from './utils.js'

declare module "fastify" {
    interface FastifyInstance {
        multitenant: {
            configProvider: TenantConfigProvider<BaseTenantConfig>
            resourceProvider: TenantResourcesProvider<BaseTenantResources>
        }
    }
}

// Default hook to run the tenant identification and resolution process
// Can be overridden by the user in the plugin options
const DEFAULT_TENANT_IDENTIFICATION_HOOK = 'onRequest'

async function fastifyMultitenant<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources>(fastify: FastifyInstance, opts: FastifyMultitenantOptions<TenantConfig, TenantResources>) {
    const identifyTenant = identifyTenantFactory(opts.tenantIdentifierStrategies)
    const configProvider = tenantConfigProviderFactory<TenantConfig>(opts.tenantConfigResolver)
    const resourceProvider = tenantResourceProviderFactory<TenantConfig, TenantResources>(opts.resources, configProvider)
    const hook = opts.hook || DEFAULT_TENANT_IDENTIFICATION_HOOK

    fastify.decorate(
        'multitenant',
        {
            configProvider: configProvider,
            resourceProvider: resourceProvider
        }
    )

    fastify.decorateRequest('tenant', null)

    fastify.addHook(hook, function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
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
                configProvider
                    .get(tenantId)
                    .then((tenantConfig) => {
                        if (!tenantConfig) {
                            done(new TenantConfigurationNotFound(tenantId))
                            return
                        }

                        // RESOLVE TENANT RESOURCES
                        resourceProvider
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