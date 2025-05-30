export class TenantConfigurationNotFound extends Error {
    statusCode: number
    
    constructor(tenantId: string) {
        super(`[${tenantId}] Tenant configuration not found. Please check if the tenant exists and is properly configured.`)
        this.name = 'TenantConfigurationNotFound'
        this.statusCode = 401
    }
}