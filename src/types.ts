import { FastifyPluginOptions, FastifyRequest } from "fastify"

export type IdentifierStrategy = (request: FastifyRequest) => string | undefined | Promise<string | undefined>

export type TenantId = string

export type BaseTenantConfig = {
    id: TenantId
}

export type ResourceName = string

export type BaseTenantResources = Record<ResourceName, any>

/** 
 * Configuration for resource factory functions.
 * 
 * @param tenantConfig The tenant configuration.
 * @param resources The already created resources for the tenant.
 */
export type TenantResourceFactoryArgs<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources> = {
    tenantConfig: TenantConfig
    resources: Partial<TenantResources>
}

/**
 * Function that creates a resource for a tenant.
 */
export type TenantResourceFactory<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources, ResourceType = any> = (args: TenantResourceFactoryArgs<TenantConfig, TenantResources>) => Promise<ResourceType>

/**
 * Function that runs before a resource is deleted by provider.
 * 
 * @param resource The resource to delete.
 */
export type TenantResourceOnDeleteHook<ResourceType> = (resource: ResourceType) => Promise<void>

export type TenantResourceConfig<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources, ResourceType = any> = {
    factory: TenantResourceFactory<TenantConfig, TenantResources, ResourceType>
    onDelete?: TenantResourceOnDeleteHook<ResourceType>
} | TenantResourceFactory<TenantConfig, TenantResources, ResourceType>

export type TenantResourceConfigs<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources, ResourceType = any> = Record<ResourceName, TenantResourceConfig<TenantConfig, TenantResources, ResourceType>>;

/**
 * Service for managing tenant resources.
 * Provides methods to create, retrieve, and invalidate resources for a specific tenant.
 */
export type TenantResourcesProvider<TenantResources> = {
    createAll: (tenantId: TenantId) => Promise<TenantResources | undefined>
    getAll: (tenantId: TenantId) => Promise<TenantResources | undefined>
    invalidate: (tenantId: TenantId) => Promise<void>
    invalidateAll: () => Promise<void>
}

export type TenantConfigResolver<TenantConfig extends BaseTenantConfig> = (tenantId: TenantId) => Promise<TenantConfig | undefined>

export type TenantConfigProvider<TenantConfig extends BaseTenantConfig> = {
    get: TenantConfigResolver<TenantConfig>
    invalidate: (tenantId: TenantId) => Promise<void>
    invalidateAll: () => Promise<void>
}

export type FastifyMultitenantOptions<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources> = FastifyPluginOptions & {
    tenantIdentifierStrategies: Array<IdentifierStrategy>
    tenantConfigResolver: TenantConfigResolver<TenantConfig>
    resources: TenantResourceConfigs<TenantConfig, TenantResources>
    hook?: 'onRequest' | 'preParsing' | 'preValidation' | 'preHandler' 
}

export type FastifyMultitenantRouteOptions = {
    config?: {
        fastifyMultitenant?: {
            exclude?: boolean
        }
    }
}