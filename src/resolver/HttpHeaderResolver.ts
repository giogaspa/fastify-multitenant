import { FastifyRequest } from "fastify";
import { Resolver } from "./Resolver";
import { Tenant, TenantRepository } from "../@types/plugin";

const DEFAULT_HEADER_NAME = 'x-tenant-id';

export class HttpHeaderResolver extends Resolver {
    private headerName: string;

    constructor(repository: TenantRepository, config: { header?: string } = {}) {
        super(repository, config);

        const { header = DEFAULT_HEADER_NAME } = config;

        this.headerName = header.toLowerCase();
    }

    async resolve(request: FastifyRequest): Promise<Tenant | undefined> {
        const tenantIdOnHeader = this.getIdentifierFrom(request);

        if (typeof tenantIdOnHeader === 'string'
            && await this.repository.has(tenantIdOnHeader)) {
            return await this.repository.get(tenantIdOnHeader);
        }

        return undefined;
    }

    getIdentifierFrom(request: FastifyRequest): string | undefined {
        return request.headers[this.headerName] as string | undefined;
    }
}