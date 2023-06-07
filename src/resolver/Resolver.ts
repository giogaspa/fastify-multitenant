import { FastifyRequest } from "fastify";
import { Tenant, TenantRepository } from "../@types/plugin";

export abstract class Resolver {
    repository: TenantRepository;
    config: any

    constructor(repository: TenantRepository, config: any = {}) {
        this.repository = repository;
        this.config = config;
    }

    abstract resolve(request: FastifyRequest): Promise<Tenant | undefined>
}