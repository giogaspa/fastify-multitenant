import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import "./@types/fastify";
import { FastifyMultitenantPluginAsync, FastifyMultitenantPluginOption } from "./@types/plugin";
import { resolveTenantOnRequest } from "./resolver/resolveTenantOnRequest";
import { TenantConnectionPool } from "./repository/TenantConnectionPool";

// Export repositories
export { InMemoryRepository } from './repository/InMemoryRepository';
export { JsonRepository } from './repository/JsonRepository';
export { PostgreSQLRepository } from './repository/PostgreSQLRepository';

// Export resolvers
export { HostnameResolver } from './resolver/HostnameResolver';
export { HttpHeaderResolver } from './resolver/HttpHeaderResolver';
export { Resolver } from './resolver/Resolver';

// Export abstract tenant request repository
export { RequestTenantRepository } from './requestContext';

const PLUGIN_NAME: string = 'fastify-multitenant-plugin';
export const DECORATOR_NAME: string = 'multitenant';

const fastifyMultitenant: FastifyMultitenantPluginAsync = async (server: FastifyInstance, option: FastifyMultitenantPluginOption) => {
  const { adminHost, tenantRepository, resolverStrategies } = option;
  //server.log.debug(`Registered Fastify Multitenant Plugin`);

  // Decorate Fastify instance with multitenant features
  server.decorate(
    DECORATOR_NAME,
    {
      tenantRepository: tenantRepository,
      tenantConnectionPool: new TenantConnectionPool(server), // Add tenant connection pool
    }
  );

  // Decorate request with multitenant features
  server.decorateRequest(
    DECORATOR_NAME,
    {
      tenant: undefined,
      tenantDB: undefined,
      isAdminHost: function isAdminHost(this: FastifyRequest) {
        return this.hostname === adminHost;
      }
    }
  );

  // Decorate reply with multitenant features
  server.decorateReply(
    DECORATOR_NAME,
    {
      badRequest: function badRequest(this: FastifyReply) {
        this.code(400).send();
      }
    }
  );

  // Execute resolver on request
  server.addHook('onRequest', resolveTenantOnRequest(resolverStrategies, server));

  // On close server disconnect from db
  server.addHook('onClose', async (server) => {
    // @ts-ignore
    await server[DECORATOR_NAME].tenantRepository.shutdown();
    // @ts-ignore
    await server[DECORATOR_NAME].tenantConnectionPool.shutdown();
  });

};

export default fp(fastifyMultitenant,
  {
    name: PLUGIN_NAME,
    fastify: '^4.x'
  }
);