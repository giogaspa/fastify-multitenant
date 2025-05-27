import { AsyncLocalStorage } from 'node:async_hooks'

type TenantResourcesStore = {
    [key: string]: unknown
}

export const TenantResourcesAsyncLocalStorage = new AsyncLocalStorage<TenantResourcesStore>()

export const tenantResourcesContext = {
    get: (key: string) => {
        const store = TenantResourcesAsyncLocalStorage.getStore()
        return store ? store[key] : undefined
    },
    getAll: () => {
        return TenantResourcesAsyncLocalStorage.getStore()
    },
}

