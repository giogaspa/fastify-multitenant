export class CannotFindTenantError extends Error {
    constructor(msg = 'Cannot find tenant') {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, CannotFindTenantError.prototype);
    }
}

export class CantResolveTenant extends Error {
    constructor(msg = 'Tenant has not been resolved') {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, CantResolveTenant.prototype);
    }
}