import { FastifyRequest } from "fastify";
import { Tenant, TenantRepository } from "../@types/plugin";

export abstract class Resolver {
    repository: TenantRepository;
    config: any | { admin: string }

    constructor(repository: TenantRepository, config: any = {}) {
        this.repository = repository;
        this.config = config;
    }

    abstract resolve(request: FastifyRequest): Promise<Tenant | undefined>

    abstract getIdentifierFrom(request: FastifyRequest): string | undefined

    isAdmin(request: FastifyRequest): boolean {
        return this.config.admin
            && this.getIdentifierFrom(request) === this.config.admin;
    }
}