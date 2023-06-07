import { FastifyRequest } from "fastify";
import { Resolver } from "./Resolver";
import { Tenant } from "../@types/plugin";

export class HostnameResolver extends Resolver {
    async resolve(request: FastifyRequest): Promise<Tenant | undefined> {
        const tenant = await this.repository.getByHostname(request.hostname);

        return tenant ? tenant : undefined;
    }
}