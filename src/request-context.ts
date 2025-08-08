import { AsyncLocalStorage } from 'node:async_hooks'

import { ResourceName } from './types.js'

type TenantResourcesStore = {
    [key: ResourceName]: unknown
}

export const TenantResourcesAsyncLocalStorage = new AsyncLocalStorage<TenantResourcesStore>()

export const tenantResourcesContext = {
    get: (key: ResourceName) => {
        const store = TenantResourcesAsyncLocalStorage.getStore()
        return store ? store[key] : undefined
    },
    getAll: () => {
        return TenantResourcesAsyncLocalStorage.getStore()
    },
}

