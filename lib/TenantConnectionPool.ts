import { Pool } from "pg";
import { FastifyInstance } from "fastify";

import { Tenant } from "../types";

export class TenantConnectionPool {

    private pool: Map<string, any> = new Map();
    private server: FastifyInstance;

    constructor(server: FastifyInstance) {
        this.server = server;
    }

    get(tenant: Tenant): Pool {
        if (this.pool.has(tenant.id)) {
            return this.pool.get(tenant.id);
        }

        const conn = new Pool({ connectionString: tenant.connectionString });

        this.pool.set(tenant.id, conn);
        return conn;
    }

    async shutdown(): Promise<void> {
        for (let [tenantId, conn] of this.pool.values()) {
            this.server.log.info(`Close connection to ${tenantId} with ${conn.totalCount} connections`);
            await conn.end();
        }
    }
}