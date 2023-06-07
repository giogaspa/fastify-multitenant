import { FastifyInstance, FastifyRequest } from "fastify";
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

const PLUGIN_NAME: string = 'fastify-multitenant-plugin';

const fastifyMultitenant: FastifyMultitenantPluginAsync = async (server: FastifyInstance, option: FastifyMultitenantPluginOption) => {
  const { adminHost, tenantRepository, resolverStrategies } = option;

  server.log.debug(`Registered Fastify Multitenant Plugin`);

  if (!server.hasDecorator('tenantRepository')) {
    server.decorate('tenantRepository', tenantRepository);
  }

  // Add tenant connection pool
  server.decorate('tenantConnectionPool', new TenantConnectionPool(server));

  // Add tenant to request
  server.decorateRequest('tenant', undefined);

  // Add isAdminHost function to request
  server.decorateRequest('isAdminHost', function isAdminHost(this: FastifyRequest) {
    return this.hostname === adminHost;
  });

  // Add badRequest to reply
  server.decorateReply('tenantBadRequest', function badRequest() {
    this.code(400).send();
  });

  // Execute resolver on request
  server.addHook('onRequest', resolveTenantOnRequest(resolverStrategies, server));

  // On close server disconnect from db
  server.addHook('onClose', async (server) => {
    await server.tenantRepository.shutdown();
    await server.tenantConnectionPool.shutdown();
  });

};

export default fp(fastifyMultitenant,
  {
    name: PLUGIN_NAME,
    fastify: '^4.x'
  }
);