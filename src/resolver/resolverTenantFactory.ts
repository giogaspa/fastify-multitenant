import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

import { withTenantDBClient } from "../requestContext";
import { FastifyMultitenantPluginOptions, Tenant, TenantsRepository } from "../@types/plugin";
import { Resolver } from "./Resolver";
import { CannotFindTenantError } from "../errors";

export type ResolverConstructorConfigType = any | { admin?: string };

type ResolverConstructor = new (repository: TenantsRepository, config?: ResolverConstructorConfigType) => Resolver

type ResolverConstructorConfiguration = {
    classConstructor: ResolverConstructor,
    config: ResolverConstructorConfigType
}

export type ResolverStrategyConstructor = ResolverConstructor | ResolverConstructorConfiguration;

type resolvedTenant = Promise<Tenant | undefined | { isAdmin: true }>;
type resolveTenantFunction = (request: FastifyRequest) => resolvedTenant;

function makeResolverList(strategies: (ResolverStrategyConstructor)[], repository: TenantsRepository) {
    return strategies.map(resolver => {
        if ('classConstructor' in resolver) {
            return new resolver.classConstructor(repository, resolver.config);
        }

        return new resolver(repository);
    });
}

function resolverFactory(server: FastifyInstance, resolverStrategies: (ResolverStrategyConstructor)[]): resolveTenantFunction {
    const resolverList = makeResolverList(resolverStrategies, server.tenantsRepository);

    return async function resolve(request: FastifyRequest): resolvedTenant {
        let i = 0;
        let tenant = undefined;

        // Loop through resolvers and stop when first resolver find tenant
        while (tenant === undefined && i < resolverList.length) {
            server.log.debug(`Run resolver ${resolverList[i].constructor.name}`);

            // If is admin request stop the loop and return
            if (resolverList[i].isAdmin(request)) {
                return { isAdmin: true }
            }

            // Try to resolve tenant
            tenant = await resolverList[i].resolve(request);

            i++;
        }

        return tenant;
    }
}

export function resolverTenantFactory(server: FastifyInstance, options: FastifyMultitenantPluginOptions) {
    const { resolverStrategies, ignoreRoutePattern } = options;

    // Create resolver function from resolver constructor
    const resolver = resolverFactory(server, resolverStrategies);

    // TODO Refactor this function
    return function onRequestResolveTenant(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
        //server.log.debug(`Run tenant resolver`);

        // If `ignoreRoutePattern` option is provided run the regexp and if true then skip the tenant resolver
        if (ignoreRoutePattern && ignoreRoutePattern.exec(request.url)) {

            //server.log.debug(`Exclude route from tenant Resolver`);

            // Continue lifecycle hooks
            done()

            // If `multitenant.exclude` route option is true then skip the tenant resolver
        } else if (request.routeConfig.multitenant?.exclude) {

            //server.log.debug(`Exclude route from tenant Resolver`);

            // Continue lifecycle hooks
            done()

            // Otherwise run the resolver
        } else {

            resolver(request)
                .then((tenant: Tenant | undefined | { isAdmin: true }) => {

                    if (tenant === undefined) {

                        done(new CannotFindTenantError);

                    } else if ('isAdmin' in tenant) {
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
                    server.log.error(JSON.stringify(error));

                    reply.tenantBadRequest();
                })

        }
    }
};