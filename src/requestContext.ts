import { AsyncLocalStorage } from "async_hooks";
import { HookHandlerDoneFunction } from "fastify";
import { Pool } from "pg";

import { Tenant } from "./@types/plugin";
import { CantResolveTenant } from "./errors";

type AsyncContext = { tenant: Tenant, db: Pool }

const asyncLocalStorage = new AsyncLocalStorage<AsyncContext>()

export function withTenant({ tenant, db }: AsyncContext, done: HookHandlerDoneFunction) {
    return asyncLocalStorage.run({ tenant, db }, done)
}

export function getRequestTenantDB(): Pool {
    const context = asyncLocalStorage.getStore()

    if (!context) {
        throw new CantResolveTenant
    }

    return context.db
}

export function getRequestTenant(): Tenant {
    const context = asyncLocalStorage.getStore()

    if (!context) {
        throw new CantResolveTenant
    }

    return context.tenant
}

export abstract class RequestTenantRepository {
    get db(): Pool | undefined {
        return getRequestTenantDB()
    }
}