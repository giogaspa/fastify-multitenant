import { AsyncLocalStorage } from "async_hooks";
import { HookHandlerDoneFunction } from "fastify";
import { Pool } from "pg";

const asyncLocalStorage = new AsyncLocalStorage();

export function withTenantDBClient(tenantDB: Pool, done: HookHandlerDoneFunction) {
    return asyncLocalStorage.run(tenantDB, done);
}

export function getRequestTenantDB(): Pool {
    return <Pool>asyncLocalStorage.getStore();
}

export abstract class RequestTenantRepository {
    get db(): Pool {
        return getRequestTenantDB();
    }
}