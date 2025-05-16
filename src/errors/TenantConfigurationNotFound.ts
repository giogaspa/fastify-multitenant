export class TenantConfigurationNotFound extends Error {
    statusCode: number
    
    constructor(message = 'Tenant configuration not found') {
        super(message)
        this.name = 'TenantConfigurationNotFound'
        this.statusCode = 401
    }
}