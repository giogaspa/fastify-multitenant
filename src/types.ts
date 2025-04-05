import { FastifyPluginOptions, FastifyRequest } from "fastify"

export type IdentifierStrategy = (request: FastifyRequest) => string | undefined | Promise<string | undefined>

export type BaseTenantId = string

export type BaseTenantConfig = {
    id: BaseTenantId
}

export type ResourceFactoryConfig<TenantConfig extends BaseTenantConfig> = {
    config: TenantConfig
    resources: any
}

export type ResourceFactoryFunction<TenantConfig extends BaseTenantConfig> = (config: ResourceFactoryConfig<TenantConfig>) => any | Promise<any>

export type ResourceFactory<TenantConfig extends BaseTenantConfig> = {
    factory: ResourceFactoryFunction<TenantConfig>
    cache?: boolean
    ttl?: number
} | ResourceFactoryFunction<TenantConfig>

export type FastifyMultitenantOptions<TenantConfig extends BaseTenantConfig> = FastifyPluginOptions & {
    tenantIdentifierStrategies: Array<IdentifierStrategy>
    resolveTenantConfig: (tenantId: BaseTenantId) => Promise<TenantConfig | undefined>
    resolverCache?: {
        enabled: true
        ttl?: number
    },
    resourceFactories: Record<string, ResourceFactory<TenantConfig>>
}

export type FastifyMultitenantRouteOptions = {
    config?: {
        fastifyMultitenant?: {
            exclude?: boolean
        }
    }
}