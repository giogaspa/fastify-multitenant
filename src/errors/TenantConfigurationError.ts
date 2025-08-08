export class TenantConfigurationError extends Error {
    statusCode: number
    
    constructor(message = 'Tenant configuration error') {
        super(message)
        this.name = 'TenantConfigurationError'
        this.statusCode = 500
    }
}