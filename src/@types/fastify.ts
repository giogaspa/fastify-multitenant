
import { Client, Pool } from 'pg'
import { TenantConnectionPool } from '../repository/TenantConnectionPool'
import { Tenant, TenantRepository } from './plugin'


declare module 'fastify' {
  export interface FastifyInstance {
    tenantRepository: TenantRepository
    tenantConnectionPool: TenantConnectionPool
  }

  export interface FastifyRequest {
    tenant: Tenant | undefined,
    tenantDB: Client | Pool | undefined,
    isTenantAdmin: boolean
  }

  interface FastifyReply {
    tenantBadRequest: () => FastifyReply,
  }
}