import { TenantId } from "../types.js"

export class TenantConfigurationNotFound extends Error {
    statusCode: number

    constructor(tenantId: TenantId) {
        super(`[${tenantId}] Tenant configuration not found. Please check if the tenant exists and is properly configured.`)
        this.name = 'TenantConfigurationNotFound'
        this.statusCode = 401
    }
}