import { existsSync, readFileSync, writeFileSync } from "fs";

import { TenantRepository, Tenant } from "../@types/plugin";
import { idGenerator } from "../util";

export class JsonRepository implements TenantRepository {

    private tenants: Map<string, Tenant> = new Map();
    private filePath: string;

    constructor(filePath: string) {
        if (!existsSync(filePath)) {
            throw new Error('Unable to find tenants configuration file');
        }

        this.filePath = filePath;
        this.tenants = new Map();

        let rawTenants: Tenant[] = JSON.parse(readFileSync(this.filePath, 'utf8').toString());

        rawTenants.forEach(tenant => {
            this.tenants.set(tenant.id, tenant);
        });
    }

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

        this.writeFile();

        return await this.get(tenant.id);
    }

    async update(tenant: Tenant): Promise<Tenant | undefined> {
        this.tenants.set(tenant.id, tenant);
        
        this.writeFile();

        return await this.get(tenant.id);
    }

    async delete(tenantId: any): Promise<boolean> {
        const result = this.tenants.delete(tenantId);

        if (result) {
            this.writeFile();
        }

        return result;
    }

    async shutdown(): Promise<void> {
        this.writeFile();
    }

    writeFile() {
        const iterator = this.tenants.values();
        let tenants = [];

        let i = 0;
        while (i < this.tenants.size) {
            tenants.push(iterator.next().value);
            i++;
        }

        writeFileSync(this.filePath, JSON.stringify(tenants, null, 4));
    }
}