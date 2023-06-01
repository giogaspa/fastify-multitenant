import { FastifyRequest } from "fastify";
import { Resolver } from "./Resolver";
import { Tenant, TenantRepository } from "../../types";

const DEFAULT_HEADER_NAME = 'x-tenant-id';

export class HttpHeaderResolver extends Resolver {
    private headerName: string;

    constructor(repository: TenantRepository, config: { header?: string } = {}) {
        super(repository);

        const { header = DEFAULT_HEADER_NAME } = config;

        this.headerName = header;
    }

    async resolve(request: FastifyRequest): Promise<Tenant | undefined> {
        const tenantIdOnHeader = request.headers[this.headerName];

        if (typeof tenantIdOnHeader === 'string' && await this.repository.has(tenantIdOnHeader)) {
            return await this.repository.get(tenantIdOnHeader);
        }

        return undefined;
    }
}