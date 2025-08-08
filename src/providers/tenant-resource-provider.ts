import { BaseTenantConfig, TenantId, TenantResourceConfigs, TenantResourcesProvider, BaseTenantResources, TenantConfigProvider } from "../types.js"

/**
 * 
 * @param resourceConfigs Tenant resource
 * @param configProvider 
 * @returns 
 */
export function tenantResourceProviderFactory<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources>(
    resourceConfigs: TenantResourceConfigs<TenantConfig, TenantResources>,
    configProvider: TenantConfigProvider<TenantConfig>
): TenantResourcesProvider<TenantResources> {
    const inMemoryResourcesCache = new Map<TenantId, TenantResources>()

    /**
     * Retrieves all resources for a given tenant ID.
     * If the resources are not cached, it creates them using the provided factories.
     * @param tenantId - The ID of the tenant for which to retrieve resources.
     * @returns A promise that resolves to a record of resources or undefined if no configuration is found.
     */
    async function getAll(tenantId: TenantId): Promise<TenantResources | undefined> {
        if (!inMemoryResourcesCache.has(tenantId)) {
            const resources = await createAll(tenantId)

            if (!resources) {
                return undefined
            }

            inMemoryResourcesCache.set(tenantId, resources)
        }

        return inMemoryResourcesCache.get(tenantId)
    }

    /**
     * Invalidates the cached resources for a specific tenant.
     * This clears the in-memory cache of resources for the specified tenant.
     * @param tenantId - The ID of the tenant whose resources should be invalidated.
     */
    async function invalidate(tenantId: TenantId) {
        if (inMemoryResourcesCache.has(tenantId)) {
            const tenantResources = inMemoryResourcesCache.get(tenantId)

            for (const [name, resource] of Object.entries(tenantResources!)) {
                const config = resourceConfigs[name]

                if (typeof config === 'object' && 'onDelete' in config && typeof config.onDelete === 'function') {
                    await config.onDelete(resource)
                }
            }

            inMemoryResourcesCache.delete(tenantId)
        }
    }

    /**
     * Invalidates all cached resources.
     * This clears the in-memory cache of resources for all tenants.
     * This is useful when you want to ensure that all resources are recreated on the next request
     */
    async function invalidateAll() {
        for (const [tenantId] of inMemoryResourcesCache.entries()) {
            await invalidate(tenantId)
        }

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

    return {
        getAll,
        invalidate,
        invalidateAll,
        createAll,
    }
}