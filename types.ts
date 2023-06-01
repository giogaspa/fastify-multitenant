import { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import { TenantConnectionPool } from './lib/TenantConnectionPool'
import { ResolverStrategyConstructor } from './lib/resolver/resolveTenantOnRequest'

declare module 'fastify' {
  interface FastifyInstance {
    tenantRepository: fastifyMultitenant.TenantRepository
    tenantConnectionPool: TenantConnectionPool
  }

  interface FastifyRequest {
    tenant: fastifyMultitenant.Tenant | undefined,
    isAdminHost: () => boolean
  }

  interface FastifyReply {
    tenantBadRequest: () => FastifyReply,
  }
}

declare namespace fastifyMultitenant {
  export type FastyfyMultitenancyPluginOption = FastifyPluginOptions & {
    adminHost: string,
    tenantRepository?: TenantRepository,
    resolverStrategies: ResolverStrategyConstructor[]
  }

  export const fastifyMultitenant: FastifyMultitenant
  export { fastifyMultitenant as default }

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
  
    shutdown(): Promise<void>
  }
}

type FastifyMultitenant = FastifyPluginAsync<fastifyMultitenant.FastyfyMultitenancyPluginOption>

declare function fastifyMultitenant(...params: Parameters<FastifyMultitenant>): ReturnType<FastifyMultitenant>
export = fastifyMultitenant