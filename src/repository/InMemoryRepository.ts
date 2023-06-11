
import { Tenant, TenantRepository } from "../@types/plugin";
import { idGenerator } from "../util";


const DEFAULT_TENANTS: Map<string, Tenant> = new Map();

export class InMemoryRepository implements TenantRepository {

    private tenants: Map<string, Tenant> = DEFAULT_TENANTS;

    async has(tenantId: any): Promise<boolean> {
        return this.tenants.has(tenantId);
    }

    async get(tenantId: any): Promise<Tenant | undefined> {
        return this.tenants.get(tenantId);
    }

    async getByHostname(hostname: string): Promise<Tenant | undefined> {
        const tenantsIterable = this.tenants.values();

        let tenant;

        while (tenant === undefined) {
            const result = tenantsIterable.next();

            if (result.done) {
                break;
            }

            if (result.value.hostname === hostname) {
                tenant = result.value;
            }
        }

        return tenant;
    }

    async add(tenant: Tenant): Promise<Tenant | undefined> {
        tenant.id = idGenerator();
        this.tenants.set(tenant.id, tenant);

        return await this.get(tenant.id);
    }

    async update(tenant: Tenant): Promise<Tenant | undefined> {
        this.tenants.set(tenant.id, tenant);

        return await this.get(tenant.id);
    }

    async delete(tenantId: any): Promise<boolean> {
        return this.tenants.delete(tenantId);
    }

    async init(): Promise<void> {
        // DO NOTHING
    }

    async shutdown(): Promise<void> {
        // DO NOTHING
    }
}