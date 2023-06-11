import { FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions } from 'fastify';
import { ResolverStrategyConstructor } from '../resolver/resolveTenantOnRequest';

export interface FastifyMultitenantPluginOption extends FastifyPluginOptions {
  tenantRepository: TenantRepository,
  resolverStrategies: ResolverStrategyConstructor[]
}

export type FastifyMultitenantPluginCallback = FastifyPluginCallback<FastifyMultitenantPluginOption>;
export type FastifyMultitenantPluginAsync = FastifyPluginAsync<FastifyMultitenantPluginOption>;

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