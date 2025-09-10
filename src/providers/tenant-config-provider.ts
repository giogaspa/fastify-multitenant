import { BaseTenantConfig, TenantId, TenantConfigResolver, TenantConfigProvider } from "../types.js"

export function tenantConfigProviderFactory<TenantConfig extends BaseTenantConfig>(resolve: TenantConfigResolver<TenantConfig>): TenantConfigProvider<TenantConfig> {
    const inMemoryConfigCache = new Map<TenantId, Promise<TenantConfig | undefined>>()

    async function get(tenantId: TenantId): Promise<TenantConfig | undefined> {
        // Singleton promise to ensure thread-safe initialization of resources
        if (!inMemoryConfigCache.has(tenantId)) {
            const config = resolve(tenantId)
            inMemoryConfigCache.set(tenantId, config)
        }

        return inMemoryConfigCache.get(tenantId)
    }

    // FIXME: This function is not thread-safe.
    /**
     * Invalidate the cached configuration for a specific tenant.
     * 
     * @param tenantId 
     */
    async function invalidate(tenantId: TenantId) {
        if (inMemoryConfigCache.has(tenantId)) {
            inMemoryConfigCache.delete(tenantId)
        }
    }

    // FIXME: This function is not thread-safe.
    /**
     * Invalidate all cached tenant configurations.
     */
    async function invalidateAll() {
        inMemoryConfigCache.clear()
    }

    return {
        get,
        invalidate,
        invalidateAll,
    }
}