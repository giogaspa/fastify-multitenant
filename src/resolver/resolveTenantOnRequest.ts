import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { withTenantDBClient } from "../requestContext";
import { Tenant, TenantRepository } from "../@types/plugin";
import { Resolver } from "./Resolver";

type ResolverConstructor = new (repository: TenantRepository, config?: any) => Resolver

type ResolverConstructorConfiguration = {
    classConstructor: ResolverConstructor,
    config: any
}

export type ResolverStrategyConstructor = ResolverConstructor | ResolverConstructorConfiguration;

function resolverFactory(
    server: FastifyInstance,
    resolverStrategies: (ResolverStrategyConstructor)[]
): (request: FastifyRequest) => Promise<Tenant | undefined | { isAdmin: true }> {
    const resolverList = resolverStrategies.map(resolver => {
        if ('classConstructor' in resolver) {
            return new resolver.classConstructor(server.tenantRepository, resolver.config);
        } else {
            return new resolver(server.tenantRepository);
        }
    });

    async function resolve(request: FastifyRequest): Promise<Tenant | undefined | { isAdmin: true }> {
        let i = 0;
        let tenant = undefined;

        while (tenant === undefined && i < resolverList.length) {
            //server.log.debug(`Run resolver ${resolverList[i].constructor.name}`);

            if (resolverList[i].isAdmin(request)) {
                return { isAdmin: true }
            }

            tenant = await resolverList[i].resolve(request);
            i++;
        }

        return tenant;
    }

    return resolve;
}

export function resolveTenantOnRequest(resolverStrategies: (ResolverStrategyConstructor)[], server: FastifyInstance) {

    // Create resolver function from resolver constructor
    const resolver = resolverFactory(server, resolverStrategies);

    return (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
        //server.log.debug(`Run tenant resolver`);

        // TODO Refactor this function
        resolver(request)
            .then((tenant: Tenant | undefined | { isAdmin: true }) => {

                if (tenant === undefined) {
                    throw new Error('Undefined tenant');
                }

                if ('isAdmin' in tenant) {
                    // Set isTenantAdmin decorator
                    request.isTenantAdmin = true;

                    // Continue lifecycle hooks
                    done();
                } else {
                    //server.log.debug(`Request resolved with tenant:`, { tenant });

                    // Set tenant decorator
                    request.tenant = tenant

                    // Retrieve tenant DB client from connection pool
                    const tenantDB = server.tenantConnectionPool.get(tenant);

                    // Set current tenant DB client decorator
                    request.tenantDB = tenantDB;

                    // Set tenantDB to abstract repository
                    withTenantDBClient(tenantDB, done);
                }

            })
            .catch(error => {
                server.log.error("Error on tenant resolver");
                server.log.error(error);

                reply.tenantBadRequest();
            })
    }
};