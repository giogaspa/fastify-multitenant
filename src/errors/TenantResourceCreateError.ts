export class TenantResourceCreateError extends Error {
    statusCode: number
    
    constructor(message = 'Tenant :resource create error', resource: string = 'resource') {
        message = message.replace(':resource', resource)
        super(message)
        this.name = 'TenantResourceCreateError'
        this.statusCode = 500
    }
}