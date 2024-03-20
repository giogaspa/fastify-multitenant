import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import "./@types/fastify";
import { FastifyMultitenantPluginOptions } from "./@types/plugin";
import { resolverTenantFactory } from "./resolver/resolverTenantFactory";
import { TenantConnectionPool } from "./repository/TenantConnectionPool";
import { badRequest } from "./util";

// Export repositories
export { InMemoryRepository } from './repository/InMemoryRepository';
export { JsonRepository } from './repository/JsonRepository';
export { PostgreSQLRepository, DEFAULT_TENANTS_TABLE_NAME } from './repository/PostgreSQLRepository';

// Export resolvers
export { HostnameResolver } from './resolver/HostnameResolver';
export { HttpHeaderResolver } from './resolver/HttpHeaderResolver';
export { Resolver } from './resolver/Resolver';

// Export abstract tenant request repository
export { RequestTenantRepository, getRequestTenantDB, getRequestTenant } from './requestContext';

export { Tenant } from "./@types/plugin";
export { createMigrationsTableQuery as postgresCreateMigrationsTableQuery } from './migrations/postgres/util';

const PLUGIN_NAME: string = '@giogaspa/fastify-multitenant';

const fastifyMultitenant: FastifyPluginAsync<FastifyMultitenantPluginOptions> = async (server: FastifyInstance, options: FastifyMultitenantPluginOptions) => {
  const { tenantsRepository } = options;

  //server.log.debug(`Registered Fastify Multitenant Plugin`);

  await tenantsRepository.init();
  server.decorate('tenantsRepository', tenantsRepository);

  // Add tenant connection pool
  server.decorate('tenantConnectionPool', new TenantConnectionPool(server));

  // Add tenant to request
  server.decorateRequest('tenant', undefined);

  // Add tenant DB to request
  server.decorateRequest('tenantDB', undefined);

  // Add isAdmin function to request
  server.decorateRequest('isTenantAdmin', false);

  // Add badRequest to reply
  server.decorateReply('tenantBadRequest', badRequest);

  // TODO to implement...maybe
  // When fastify is ready run repository setup()
  /*   server.addHook('onReady', async function () {
      // During repository setup check table existence or other stuff
      await this.tenantsRepository.setup()
    }) */

  // Execute resolver on request
  server.addHook('onRequest', resolverTenantFactory(server, options));

  // On close server disconnect from db
  server.addHook('onClose', async (server) => {
    await server.tenantsRepository.shutdown();
    await server.tenantConnectionPool.shutdown();
  });

};

export default fp(fastifyMultitenant,
  {
    name: PLUGIN_NAME,
    fastify: '^4.26.2'
  }
);