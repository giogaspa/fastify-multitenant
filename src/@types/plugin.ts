import { FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions } from 'fastify';
import { ResolverStrategyConstructor } from '../resolver/resolverTenantFactory';

export interface FastifyMultitenantPluginOptions extends FastifyPluginOptions {
  tenantRepository: TenantRepository,
  resolverStrategies: ResolverStrategyConstructor[],
  ignoreRoutePattern?: RegExp
}

export type FastifyMultitenantPluginCallback = FastifyPluginCallback<FastifyMultitenantPluginOptions>;
export type FastifyMultitenantPluginAsync = FastifyPluginAsync<FastifyMultitenantPluginOptions>;

export type Tenant = {
  id: string,
  hostname: string,
  connectionString: string
}

export interface TenantRepository {
  has(tenantId: any): Promise<boolean>

  get(tenantId: any): Promise<Tenant | undefined>

  getByHostname(hostname: string): Promise<Tenant | undefined>

  add(tenant: Tenant): Promise<Tenant | undefined>

  update(tenant: Tenant): Promise<Tenant | undefined>

  delete(tenantId: any): Promise<boolean>

  init(): Promise<void>

  shutdown(): Promise<void>
}