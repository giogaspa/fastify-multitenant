import { eq } from 'drizzle-orm'
import { tenantResourcesContext } from '@giogaspa/fastify-multitenant'

import { greetings, TenantDatabaseType } from '../../../schemas/tenant.schema.js'

export class GreetingsRepository {
    private get db() {
        return tenantResourcesContext.get('db') as TenantDatabaseType
    }

    async getAll() {
        return this.db.query.greetings.findMany()
    }

    async getById(id: number) {
        return this.db.query.greetings.findFirst({ where: eq(greetings.id, id) })
    }

    async getRandom() {
        const allGreetings = await this.getAll()
        if (allGreetings.length === 0) {
            return null
        }
        const randomIndex = Math.floor(Math.random() * allGreetings.length)
        return allGreetings[randomIndex]
    }
}