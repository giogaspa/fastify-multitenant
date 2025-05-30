export class TenantResourcesNotFound extends Error {
    statusCode: number
    
    constructor(tenantId: string) {
        super(`[${tenantId}] Tenant resources not found. Please ensure that the resources are properly configured and available for the tenant.`)
        this.name = 'TenantResourcesNotFound'
        this.statusCode = 500
    }
}