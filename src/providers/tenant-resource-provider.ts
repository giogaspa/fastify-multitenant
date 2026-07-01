import { FastifyBaseLogger } from "fastify"

import { BaseTenantConfig, TenantId, TenantResourceConfigs, TenantResourcesProvider, BaseTenantResources, TenantConfigProvider, TenantResourceConfig, TenantResourceOnDeleteHook } from "../types.js"

/**
 *
 * @param resourceConfigs Tenant resource
 * @param configProvider
 * @param logger Optional logger used to report errors.
 * @returns
 */
export function tenantResourceProviderFactory<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources>(
    resourceConfigs: TenantResourceConfigs<TenantConfig, TenantResources>,
    configProvider: TenantConfigProvider<TenantConfig>,
    logger?: FastifyBaseLogger
): TenantResourcesProvider<TenantResources> {
    const inMemoryResourcesCache = new Map<TenantId, Promise<TenantResources | undefined>>()

    /**
     * Retrieves all resources for a given tenant ID.
     * If the resources are not cached, it creates them using the provided factories.
     * @param tenantId - The ID of the tenant for which to retrieve resources.
     * @returns A promise that resolves to a record of resources or undefined if no configuration is found.
     */
    async function getAll(tenantId: TenantId): Promise<TenantResources | undefined> {
        if (!inMemoryResourcesCache.has(tenantId)) {
            const resources = createAll(tenantId)
            inMemoryResourcesCache.set(tenantId, resources)
        }

        return inMemoryResourcesCache.get(tenantId)
    }

    // FIXME: This function is not thread-safe.
    /**
     * Invalidates the cached resources for a specific tenant.
     * This clears the in-memory cache of resources for the specified tenant.
     * @param tenantId - The ID of the tenant whose resources should be invalidated.
     */
    async function invalidate(tenantId: TenantId) {
        if (!inMemoryResourcesCache.has(tenantId)) {
            logger?.debug({ tenantId }, `No cached resources found for tenant ${tenantId}. Nothing to invalidate.`)
            return
        }

        try {
            // The cache stores the resource-creation promise; await it before iterating.
            const tenantResourcesPromise = inMemoryResourcesCache.get(tenantId)

            // Remove the tenant's resources from the cache before awaiting, so a concurrent getAll
            // rebuilds a fresh resource instead of receiving the one being torn down (evict-first).
            inMemoryResourcesCache.delete(tenantId)

            const tenantResources = await tenantResourcesPromise

            if (tenantResources) {
                // Reverse the order of the resources to ensure that the onDelete hooks are called in the reverse order of creation
                const resources = Object.entries(tenantResources).reverse()

                // Run the onDelete hooks for each resource if they are defined
                for (const [name, resource] of resources) {
                    const config = resourceConfigs[name]

                    if (hasOnDeleteHook(config)) {
                        try {
                            await config.onDelete(resource)
                        } catch (err) {
                            // Best-effort cleanup: log and keep tearing down the remaining resources.
                            logger?.error({ err, tenantId, resource: name }, `Tenant resource ${name} onDelete hook failed for tenant ${tenantId}`)
                        }
                    }
                }
            }
        } catch (err) {
            // Resource creation failed earlier (a rejected promise is cached): there is nothing
            // to tear down — the poisoned entry has already been evicted above.
            logger?.debug({ err, tenantId }, `Invalidating a tenant ${tenantId} whose resource creation had failed.`)
        }
    }

    // FIXME: This function is not thread-safe.
    /**
     * Invalidates all cached resources.
     * This clears the in-memory cache of resources for all tenants.
     * This is useful when you want to ensure that all resources are recreated on the next request
     */
    async function invalidateAll() {
        const tenantIds = Array.from(inMemoryResourcesCache.keys())
        await Promise.allSettled(tenantIds.map(invalidate))

        inMemoryResourcesCache.clear()
    }

    /**
     * Creates all resources for a given tenant ID using the provided factories.
     * 
     * @param tenantId - The ID of the tenant for which to create resources.
     * @returns A promise that resolves to a record of created resources or undefined if no configuration is found.
     */
    async function createAll(tenantId: TenantId): Promise<TenantResources | undefined> {
        const resources = {} as Partial<TenantResources>
        const tenantConfig = await configProvider.get(tenantId)

        if (!tenantConfig) {
            return undefined
        }

        for (const [name, resourceConfig] of Object.entries(resourceConfigs)) {
            if (typeof resourceConfig === 'function') {
                resources[name as keyof TenantResources] = await resourceConfig({ tenantConfig, resources })
            } else if (typeof resourceConfig.factory === 'function') {
                const { factory: resourceFactory } = resourceConfig
                resources[name as keyof TenantResources] = await resourceFactory({ tenantConfig, resources })
            }
        }

        return resources as TenantResources
    }

    function hasOnDeleteHook(config: TenantResourceConfig<TenantConfig, TenantResources, any>): config is TenantResourceConfig<TenantConfig, TenantResources, any> & { onDelete: TenantResourceOnDeleteHook<any> } {
        return config
            && typeof config === 'object'
            && 'onDelete' in config
            && typeof config.onDelete === 'function'
    }

    return {
        getAll,
        invalidate,
        invalidateAll,
        createAll,
    }
}