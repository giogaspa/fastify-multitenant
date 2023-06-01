import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { withTenantDBClient } from "../requestContext";
import { Tenant, TenantRepository } from "../../types";
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
): (request: FastifyRequest) => Promise<Tenant | undefined> {
    const resolverList = resolverStrategies.map(resolver => {
        if ('classConstructor' in resolver) {
            return new resolver.classConstructor(server.tenantRepository, resolver.config);
        } else {
            return new resolver(server.tenantRepository);
        }
    });

    async function resolve(request: FastifyRequest): Promise<Tenant | undefined> {
        let i = 0;
        let tenant = undefined;

        while (tenant === undefined && i < resolverList.length) {
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

        resolver(request)
            .then((tenant: Tenant | undefined) => {

                if (tenant !== undefined) {

                    //Set tenant decorator
                    request.tenant = tenant

                    //Set tenant db client to decorator
                    const tenantDB = server.tenantConnectionPool.get(tenant);

                    withTenantDBClient(tenantDB, done);

                } else {

                    if (request.isAdminHost()) {
                        server.log.debug('Is admin');
                        done();
                    } else {
                        reply.tenantBadRequest();
                    }
                }


            })
            .catch(error => {
                server.log.error("Error on tenant resolver");
                server.log.error(error);
                reply.tenantBadRequest();
            })
    }
};