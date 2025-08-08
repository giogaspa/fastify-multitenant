export class TenantRequiredError extends Error {
    statusCode: number

    constructor() {
        super(`Tenant is required for this operation. Please ensure that the tenant is specified in the request.`)
        this.name = 'TenantRequiredError'
        this.statusCode = 400
    }
}