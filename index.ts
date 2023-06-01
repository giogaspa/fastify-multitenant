import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { resolveTenantOnRequest } from "./lib/resolver/resolveTenantOnRequest";
import { TenantConnectionPool } from "./lib/TenantConnectionPool";
import { FastyfyMultitenancyPluginOption } from "./types";

export const PLUGIN_NAME: string = 'multitenancy';

export const multitenancyPlugin: FastifyPluginAsync<FastyfyMultitenancyPluginOption> = async (server: FastifyInstance, option: FastyfyMultitenancyPluginOption) => {
  const { adminHost, tenantRepository, resolverStrategies } = option;

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

export default fp(multitenancyPlugin, { name: PLUGIN_NAME, fastify: '^4.x' });