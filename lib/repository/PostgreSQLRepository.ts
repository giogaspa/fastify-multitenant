import { Pool, PoolConfig, QueryResultRow } from "pg";

import { Tenant, TenantRepository } from "../../types";
import { idGenerator } from "../util";

//FIXME get tenant table name from .env file
const TENANT_TABLE = 'tenant';

export class PostgreSQLRepository implements TenantRepository {
     private db: Pool;

     constructor(config: PoolConfig) {
          this.db = new Pool(config);
     }

     async has(tenantId: any): Promise<boolean> {
          //FIXME use library for sanitize inputs like @nearform/sql
          const r = await this.db.query(
               `SELECT * 
                FROM ${TENANT_TABLE} 
                WHERE id = $1`,
               [tenantId]
          );

          return r.rowCount === 1;
     }

     async get(tenantId: any): Promise<Tenant | undefined> {
          //FIXME use library for sanitize inputs like @nearform/sql
          const r = await this.db.query(
               `SELECT * 
                FROM ${TENANT_TABLE} 
                WHERE id = $1`,
               [tenantId]
          );

          return r.rowCount === 1 ? this.createTenantFromRow(r.rows[0]) : undefined;
     }

     async getByHostname(hostname: string): Promise<Tenant | undefined> {
          //FIXME use library for sanitize inputs like @nearform/sql
          const r = await this.db.query(
               `SELECT *
                FROM ${TENANT_TABLE} 
                WHERE hostname = $1`,
               [hostname]
          );

          return r.rowCount === 1 ? this.createTenantFromRow(r.rows[0]) : undefined;
     }

     async add(tenant: Tenant): Promise<Tenant | undefined> {
          tenant.id = idGenerator();

          //FIXME use library for sanitize inputs like @nearform/sql
          const r = await this.db.query(
               `INSERT INTO ${TENANT_TABLE} (id, hostname, connection_string) 
                VALUES ($1, $2, $3)`,
               [tenant.id, tenant.hostname, tenant.connectionString]
          );

          return r.rowCount === 1 ? tenant : undefined;
     }

     async update(tenant: Tenant): Promise<Tenant | undefined> {
          //FIXME use library for sanitize inputs like @nearform/sql
          const r = await this.db.query(
               `UPDATE ${TENANT_TABLE} 
                SET hostname = $2, 
                    connection_string = $3 
                WHERE id = $1`,
               [tenant.id, tenant.hostname, tenant.connectionString]
          );

          return r.rowCount === 1 ? tenant : undefined;
     }

     async delete(tenantId: any): Promise<boolean> {
          //FIXME use library for sanitize inputs like @nearform/sql
          const r = await this.db.query(
               `DELETE FROM ${TENANT_TABLE} 
                WHERE id = $1`,
               [tenantId]
          );

          return r.rowCount === 1;
     }

     // TODO Maybe run repository setup action like create db tables if not present
     async setup(): Promise<void> {

     }

     async shutdown(): Promise<void> {
          await this.db.end();
     }

     get database(): Pool {
          return this.db;
     }

     createTenantFromRow(row: QueryResultRow): Tenant {
          return {
               id: row.id,
               hostname: row.hostname,
               connectionString: row.connection_string
          } as Tenant;
     }
}