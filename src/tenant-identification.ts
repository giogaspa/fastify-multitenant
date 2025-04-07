import { FastifyRequest } from "fastify"
import { BaseTenantId, IdentifierStrategy } from "./types.js"

export function identifyTenantFactory(strategies: IdentifierStrategy[]) {
    if (!strategies || strategies.length === 0) {
        return async () => undefined
    }

    return async function identifyTenant(request: FastifyRequest): Promise<BaseTenantId | undefined> {
        let tenantId: BaseTenantId | undefined = undefined

        for (const strategyFn of strategies) {
            tenantId = await strategyFn(request)
            if (tenantId) {
                break // Exit the loop if a tenant ID is found
            }
        }

        return tenantId
    }
}