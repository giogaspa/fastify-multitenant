import { FastifyRequest } from "fastify";
import { Tenant, TenantsRepository } from "../@types/plugin";
import { ResolverConstructorConfigType } from "./resolverTenantFactory";

export abstract class Resolver {
    repository: TenantsRepository;
    config: ResolverConstructorConfigType;

    constructor(repository: TenantsRepository, config: ResolverConstructorConfigType = {}) {
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