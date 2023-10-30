
import { Client, Pool } from 'pg'
import { TenantConnectionPool } from '../repository/TenantConnectionPool'
import { Tenant, TenantsRepository } from './plugin'


declare module 'fastify' {
  export interface FastifyInstance {
    tenantsRepository: TenantsRepository
    tenantConnectionPool: TenantConnectionPool
  }

  export interface FastifyRequest {
    tenant: Tenant | undefined,
    tenantDB: Client | Pool | undefined,
    isTenantAdmin: boolean
  }

  export interface FastifyContextConfig {
    multitenant?: {
      exclude?: boolean
    }
  }

  interface FastifyReply {
    tenantBadRequest: () => FastifyReply,
  }
}