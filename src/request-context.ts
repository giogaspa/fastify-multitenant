import { AsyncLocalStorage } from 'node:async_hooks'

import { BaseTenantResources, ResourceName } from './types.js'

export class TenantResourcesRequestContext<T extends BaseTenantResources> {
    private _als: AsyncLocalStorage<T> | null = null

    get instance() {
        if (!this._als) {
            throw new Error('AsyncLocalStorage instance not initialized. Is the "disableRequestContext" option enabled?')
        }

        return this._als
    }

    init() {
        if (!this._als) {
            this._als = new AsyncLocalStorage<T>()
        }
    }

    get(key: ResourceName) {
        const store = this.instance.getStore()

        return store ? store[key] : undefined
    }

    getAll() {
        return this.instance.getStore()
    }
}