export class TenantRequiredError extends Error {
    statusCode: number
    
    constructor(message = 'Tenant is required') {
        super(message)
        this.name = 'TenantRequiredError'
        this.statusCode = 401
    }
}