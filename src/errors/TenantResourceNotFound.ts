export class TenantResourceNotFound extends Error {
    statusCode: number
    
    constructor(message = 'Tenant resource not found') {
        super(message)
        this.name = 'TenantResourceNotFound'
        this.statusCode = 500
    }
}