import { BaseTenantConfig, BaseTenantId, ConfigResolver } from "./types.js"

export type TenantConfigResolver<TenantId extends BaseTenantId, TenantConfig extends BaseTenantConfig> = {
    get: ConfigResolver<TenantConfig>
    invalidate: (tenantId: TenantId) => void
    invalidateAll: () => void
}

export function tenantConfigResolverFactory<TenantConfig extends BaseTenantConfig>(resolve: ConfigResolver<TenantConfig>): TenantConfigResolver<string, TenantConfig> {
    const inMemoryConfigCache = new Map<BaseTenantId, TenantConfig>()

    async function get(tenantId: BaseTenantId): Promise<TenantConfig | undefined> {
        if (!inMemoryConfigCache.has(tenantId)) {
            const config = await resolve(tenantId)

            if (config) {
                inMemoryConfigCache.set(tenantId, config)
            }
        }

        return inMemoryConfigCache.get(tenantId)
    }

    async function invalidate(tenantId: BaseTenantId) {
        if (inMemoryConfigCache.has(tenantId)) {
            inMemoryConfigCache.delete(tenantId)
        }
    }

    async function invalidateAll() {
        inMemoryConfigCache.clear()
    }

    return {
        get,
        invalidate,
        invalidateAll,
    }
}