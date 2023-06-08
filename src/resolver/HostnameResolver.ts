import { FastifyRequest } from "fastify";
import { Resolver } from "./Resolver";
import { Tenant } from "../@types/plugin";

export class HostnameResolver extends Resolver {
    async resolve(request: FastifyRequest): Promise<Tenant | undefined> {
        const identifier = this.getIdentifierFrom(request);

        if (identifier === undefined) {
            return undefined;
        }

        const tenant = await this.repository.getByHostname(identifier);

        return tenant ? tenant : undefined;
    }

    getIdentifierFrom(request: FastifyRequest): string | undefined {
        return request.hostname;
    }
}