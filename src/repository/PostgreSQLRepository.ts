import { Client, ClientConfig, Pool, PoolConfig, QueryResultRow } from "pg";

import { Tenant, TenantRepository } from "../@types/plugin";
import { idGenerator } from "../util";
import SQL = require("@nearform/sql");

const DEFAULT_TENANT_TABLE_NAME = 'tenants';

export interface PostgreSQLRepositoryConfig {
     tableName?: string;
     clientConfig?: ClientConfig | PoolConfig;
     client?: Client | Pool;
}

interface PostgreSQLRepositoryOptions {
     tableName: string;
     clientConfig?: ClientConfig | PoolConfig | undefined;
}

class MissingConfigurationParameter extends Error {
     constructor() {
          super('"clientConfig" or "client" must be provided to the PostgreSQLRepository constructor');

          Object.setPrototypeOf(this, MissingConfigurationParameter.prototype);
     }
}

export class PostgreSQLRepository implements TenantRepository {
     public client: Client | Pool;
     private isExternalClient: boolean = false;
     private options: PostgreSQLRepositoryOptions;

     constructor(options: PostgreSQLRepositoryConfig) {
          const {
               tableName = DEFAULT_TENANT_TABLE_NAME,
               clientConfig,
               client
          } = options;

          this.options = {
               tableName,
               clientConfig
          };

          if (clientConfig === undefined
               && client === undefined) {
               throw new MissingConfigurationParameter();
          }

          if (client) {
               this.client = client;
               this.isExternalClient = true;
               return;
          }

          if (this.isPoolConfig()) {
               this.client = new Pool(this.options.clientConfig);
               return;
          }

          this.client = new Client(this.options.clientConfig);
     }

     private isPoolConfig() {
          return this.options.clientConfig
               && (
                    'max' in this.options.clientConfig
                    || 'min' in this.options.clientConfig
                    || 'idleTimeoutMillis' in this.options.clientConfig
                    || 'log' in this.options.clientConfig
                    || 'Promise' in this.options.clientConfig
                    || 'allowExitOnIdle' in this.options.clientConfig
                    || 'maxUses' in this.options.clientConfig
               )
     }

     private get tableName(): string {
          return this.options.tableName;
     }

     async has(tenantId: any): Promise<boolean> {

          const query = SQL`
          SELECT *
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE id = ${tenantId}
          `;

          const r = await this.client.query(query);

          return r.rowCount === 1;
     }

     async get(tenantId: any): Promise<Tenant | undefined> {

          const query = SQL`
          SELECT *
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE id = ${tenantId}
          `;

          const r = await this.client.query(query);

          return r.rowCount === 1 ? this.createTenantFromRow(r.rows[0]) : undefined;
     }

     async getByHostname(hostname: string): Promise<Tenant | undefined> {

          const query = SQL`
          SELECT *
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE hostname = ${hostname}
          `;

          const r = await this.client.query(query);

          return r.rowCount === 1 ? this.createTenantFromRow(r.rows[0]) : undefined;
     }

     async add(tenant: Tenant): Promise<Tenant | undefined> {
          tenant.id = tenant.id || idGenerator();

          const query = SQL`
          INSERT INTO ${SQL.quoteIdent(this.tableName)} (id, hostname, connection_string) 
          VALUES (${tenant.id},${tenant.hostname},${tenant.connectionString})
          `;

          const r = await this.client.query(query);

          return r.rowCount === 1 ? tenant : undefined;
     }

     async update(tenant: Tenant): Promise<Tenant | undefined> {
          const query = SQL`
          UPDATE ${SQL.quoteIdent(this.tableName)} 
          SET hostname = ${tenant.hostname}, 
              connection_string = ${tenant.connectionString}
          WHERE id = ${tenant.id}
          `;

          const r = await this.client.query(query);

          return r.rowCount === 1 ? tenant : undefined;
     }

     async delete(tenantId: any): Promise<boolean> {
          const query = SQL`
          DELETE
          FROM ${SQL.quoteIdent(this.tableName)} 
          WHERE id = ${tenantId}`;

          const r = await this.client.query(query);

          return r.rowCount === 1;
     }

     //TODO to implement
     /*      async setup(): Promise<void> {
               // Check if tenants table exists
               const query = SQL`
               SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE    table_name   = ${SQL.quoteIdent(this.tableName)}
               )`;
     
               const r = await this.client.query(query);
     
               throw new Error('Unable to find tenants table')
          } */

     // Connect to admin database
     async init(): Promise<void> {
          if (this.isExternalClient) {
               return
          }

          await this.client.connect();
     }

     async shutdown(): Promise<void> {
          if (this.isExternalClient) {
               return
          }

          await this.client.end();
     }

     protected createTenantFromRow(row: QueryResultRow): Tenant {
          return {
               id: row.id,
               hostname: row.hostname,
               connectionString: row.connection_string
          } as Tenant;
     }
}