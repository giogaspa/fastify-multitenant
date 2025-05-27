import { eq } from 'drizzle-orm'
import { tenantResourcesContext } from '@giogaspa/fastify-multitenant'

import { products, TenantDatabaseType } from '../../../schemas/tenant.schema.js'

export class ProductsRepository {
    private get db() {
        return tenantResourcesContext.get('db') as TenantDatabaseType
    }

    async getAll() {
        return this.db.query.products.findMany()
    }

    async getById(id: string) {
        return this.db.query.products.findFirst({ where: eq(products.id, id) })
    }

    async getRandom() {
        const allProducts = await this.getAll()
        if (allProducts.length === 0) {
            return null
        }
        const randomIndex = Math.floor(Math.random() * allProducts.length)
        return allProducts[randomIndex]
    }
}