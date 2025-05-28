import { TenantConfigResolver } from "./tenant-config-resolver.js"
import { BaseTenantConfig, BaseTenantId, ResourceFactories } from "./types.js"

const DEFAULT_RESOURCE_FACTORY_CACHE_TTL = -1 // -1 means infinite cache. Singleton instance of resource factory

export type TenantResourceResolver<TenantId extends BaseTenantId> = {
    createAll: (tenantId: TenantId) => Promise<Record<string, unknown> | undefined>
    getAll: (tenantId: TenantId) => Promise<Record<string, unknown> | undefined>
    invalidateAll: () => void
}

export function tenantResourceResolverFactory<TenantId extends BaseTenantId, TenantConfig extends BaseTenantConfig>(
    resourceFactories: ResourceFactories<TenantConfig>,
    configResolver: TenantConfigResolver<TenantId, TenantConfig>
): TenantResourceResolver<TenantId> {
    const inMemoryResourcesCache = new Map<BaseTenantId, Record<string, unknown>>()

    /**
     * Retrieves all resources for a given tenant ID.
     * If the resources are not cached, it creates them using the provided factories.
     * @param tenantId - The ID of the tenant for which to retrieve resources.
     * @returns A promise that resolves to a record of resources or undefined if no configuration is found.
     */
    async function getAll(tenantId: TenantId): Promise<Record<string, unknown> | undefined> {
        if (!inMemoryResourcesCache.has(tenantId)) {
            const resources = await createAll(tenantId)

            if (!resources) {
                return undefined
            }

            inMemoryResourcesCache.set(tenantId, resources)
        }

        return inMemoryResourcesCache.get(tenantId)
    }

    function invalidateAll() {
        inMemoryResourcesCache.clear()
    }

    /**
     * Creates all resources for a given tenant ID using the provided factories.
     * @param tenantId - The ID of the tenant for which to create resources.
     * @returns A promise that resolves to a record of created resources or undefined if no configuration is found.
     */
    async function createAll(tenantId: TenantId): Promise<Record<string, unknown> | undefined> {
        const resources: Record<string, any> = {}
        const tenantConfig = await configResolver.get(tenantId)

        if (!tenantConfig) {
            return undefined
        }

        for (const [name, factory] of Object.entries(resourceFactories)) {
            if (typeof factory === 'function') {
                resources[name] = await factory({ config: tenantConfig, resources })
            } else if (typeof factory.factory === 'function') {
                const { factory: resourceFactory, cacheTtl } = factory
                resources[name] = await resourceFactory({ config: tenantConfig, resources })
            }
        }

        return resources
    }

    return {
        getAll,
        invalidateAll,
        createAll,
    }
}