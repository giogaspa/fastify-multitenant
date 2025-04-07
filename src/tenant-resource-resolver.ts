import { TenantConfigResolver } from "./tenant-config-resolver.js"
import { BaseTenantConfig, BaseTenantId, ResourceFactories } from "./types.js"

const DEFAULT_RESOURCE_FACTORY_CACHE_TTL = -1 // -1 means infinite cache. Singleton instance of resource factory

export type TenantResourceResolver<TenantId extends BaseTenantId> = {
    getAll: (tenantId: TenantId) => Promise<Record<string, any> | undefined>
    invalidateAll: () => void
}

export function tenantResourceResolverFactory<TenantId extends BaseTenantId, TenantConfig extends BaseTenantConfig>(
    resourceFactories: ResourceFactories<TenantConfig>,
    configResolver: TenantConfigResolver<TenantId, TenantConfig>
): TenantResourceResolver<TenantId> {
    const inMemoryResourcesCache = new Map<BaseTenantId, Record<string, any>>()

    async function getAll(tenantId: TenantId): Promise<any | undefined> {
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

    async function createAll(tenantId: TenantId): Promise<any | undefined> {
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
    }
}