
import { Client, Pool } from 'pg'
import { TenantConnectionPool } from '../repository/TenantConnectionPool'
import { Tenant, TenantRepository } from './plugin'


declare module 'fastify' {
  export interface FastifyInstance {
    multitenant: {
      tenantRepository: TenantRepository
      tenantConnectionPool: TenantConnectionPool
    }
  }

  export interface FastifyRequest {
    multitenant: {
      current: Tenant | undefined,
      currentDB: Client | Pool | undefined,
      isAdminHost: () => boolean
    }
  }

  interface FastifyReply {
    multitenant: {
      badRequest: () => FastifyReply,
    }
  }
}