import { FastifyRequest } from "fastify";
import { Tenant, TenantRepository } from "../@types/plugin";
import { ResolverConstructorConfigType } from "./resolveTenantOnRequest";

export abstract class Resolver {
    repository: TenantRepository;
    config: ResolverConstructorConfigType;

    constructor(repository: TenantRepository, config: ResolverConstructorConfigType = {}) {
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