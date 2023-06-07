import { Pool, PoolConfig, QueryResultRow } from "pg";

import { Tenant, TenantRepository } from "../@types/plugin";
import { idGenerator } from "../util";
import SQL = require("@nearform/sql");

const DEFAULT_TENANT_TABLE_NAME = 'tenant';

export interface PostgreSQLRepositoryOptions {
     tableName?: string;
     config: PoolConfig
}

export class PostgreSQLRepository implements TenantRepository {
     private db: Pool;
     private options: PostgreSQLRepositoryOptions;

     constructor(options: PostgreSQLRepositoryOptions) {
          this.options = {
               tableName: DEFAULT_TENANT_TABLE_NAME,
               ...options
          };
          this.db = new Pool(options.config);
     }

     private get tableName(): string {
          //@ts-ignore
          return this.options.tableName;
     }

     async has(tenantId: any): Promise<boolean> {

          const query = SQL`
          SELECT *
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE id = ${tenantId}
          `;

          const r = await this.db.query(query);

          return r.rowCount === 1;
     }

     async get(tenantId: any): Promise<Tenant | undefined> {

          const query = SQL`
          SELECT *
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE id = ${tenantId}
          `;

          const r = await this.db.query(query);

          return r.rowCount === 1 ? this.createTenantFromRow(r.rows[0]) : undefined;
     }

     async getByHostname(hostname: string): Promise<Tenant | undefined> {

          const query = SQL`
          SELECT *
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE hostname = ${hostname}
          `;

          const r = await this.db.query(query);

          return r.rowCount === 1 ? this.createTenantFromRow(r.rows[0]) : undefined;
     }

     async add(tenant: Tenant): Promise<Tenant | undefined> {
          tenant.id = idGenerator();

          const query = SQL`
          INSERT INTO ${SQL.quoteIdent(this.tableName)} (id, hostname, connection_string) 
          VALUES (${tenant.id},${tenant.hostname},${tenant.connectionString})
          `;

          const r = await this.db.query(query);

          return r.rowCount === 1 ? tenant : undefined;
     }

     async update(tenant: Tenant): Promise<Tenant | undefined> {
          const query = SQL`
          UPDATE ${SQL.quoteIdent(this.tableName)} 
          SET hostname = ${tenant.hostname}, 
              connection_string = ${tenant.connectionString}
          WHERE id = ${tenant.id}
          `;

          const r = await this.db.query(query);

          return r.rowCount === 1 ? tenant : undefined;
     }

     async delete(tenantId: any): Promise<boolean> {
          const query = SQL`
          DELETE
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE id = ${tenantId}`;

          const r = await this.db.query(query);

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