
import { Client, Pool } from 'pg'
import { TenantConnectionPool } from '../repository/TenantConnectionPool'
import { Tenant, TenantRepository } from './plugin'


declare module 'fastify' {
  export interface FastifyInstance<RawServer, RawRequest, RawReply, Logger> {
    tenantRepository: TenantRepository
    tenantConnectionPool: TenantConnectionPool
  }

  export interface FastifyRequest {
    tenant: Tenant | undefined,
    tenantDB: Client | Pool | undefined,
    isAdminHost: () => boolean
  }

  interface FastifyReply {
    tenantBadRequest: () => FastifyReply,
  }
}