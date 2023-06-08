# :construction: @giogaspa/fastify-multitenant :construction:

 Multitenant plugin for Fastify.

 Supports Fastify versions `4.x`

## Status

Pre-alpha.

**This is a work in progress and api could change quickly!!!**  
**The plugin is not ready for production, use at your own risk!**  

Please look at the develop branch for ongoing development.

## Install

Using npm:

``` shell
npm i @giogaspa/fastify-multitenant
```

Using yarn:

``` shell
yarn add @giogaspa/fastify-multitenant
```

## Usage

Require `@giogaspa/fastify-multitenant` and register as fastify plugin.  
This will decorate your `fastify` instance with `tenantRepository` and fastify `request` 
is decorate with `tenant`, `tenantDB` and `isTenantAdmin`.

Tenant information is managed through an object implementing the `TenantRepository` interface.  
Currently the plugin provides implementation of these repositories:

- InMemoryRepository (useful for testing)
- JsonRepository
- PostgreSQLRepository
- MySQLRepository **(under development)**

If you want you can create your own custom repository, you just need to implement `TenantRepository`
and pass the created repository in the plugin configuration object `FastifyMultitenantPluginOption`.

To determine the current tenant, an array of tenant resolvers must be passed (at least one resolver is needed)
in the plugin configuration.  
Currently the plugin provides these resolvers:

- HostnameResolver
- HttpHeaderResolver

If you want to implement your own resolver extend the `Resolver` class.

To interact with the tenant database of the current request you can use the `request.tenantDB` object
or implement a repository that extends the `RequestTenantRepository` class.
`RequestTenantRepository` has the property `db` which is the db client of the current tenant.

Install also [@giogaspa/fastify-multitenant-cli](https://github.com/giogaspa/fastify-multitenant-cli)
in order to manage setup of admin and tenant DB and handle migrations.


```js
const fastify = require('fastify')();
const { PostgreSQLRepository, HostnameResolver, HttpHeaderResolver } = require("@giogaspa/fastify-multitenant");

// Instantiate admin repository
const adminRepository = new PostgreSQLRepository({ clientConfig: { connectionString: "postgresql://postgres:1234@localhost:5432/postgres?schema=public" } });
//const adminRepository = new JsonRepository(join(__dirname, '..','.tenants.json'));
//const adminRepository = new InMemoryRepository();

fastify.register(require('@giogaspa/fastify-multitenant'), {
    tenantRepository: adminRepository, // Repository to retrieve tenant connection information. 
    resolverStrategies: [ // Strategies to recognize the tenant
        HostnameResolver, // Hostname strategy
        {
            classConstructor: HttpHeaderResolver, // Header parameter strategy
            config: {
                admin: 'admin' // admin tenant identifier
                header: 'x-tenant',
            }
        }
    ]
})

fastify.listen({ port: 3000 })
```

### fastify.tenantRepository

Repository class to interact with tenants

```js
interface TenantRepository {
  has(tenantId: any): Promise<boolean>

  get(tenantId: any): Promise<Tenant | undefined>

  getByHostname(hostname: string): Promise<Tenant | undefined>

  add(tenant: Tenant): Promise<Tenant | undefined>

  update(tenant: Tenant): Promise<Tenant | undefined>

  delete(tenantId: any): Promise<boolean>

  shutdown(): Promise<void>
}
```

### request.tenant

Get tenant of current request

```js
export type Tenant = {
  id: string,
  hostname: string,
  connectionString: string
}
```

### request.tenantDB

DB client of resolved tenant. The type of client depends on repository configuration.  
`pg` library clients are supported for now, but clients for `mysql` and other db's will also be supported in the future.

### request.isTenantAdmin

Return true if request is for admin.

## Custom Tenant Repository

// TODO write section

## Custom Resolver

// TODO write section

## How to interact with Tenant DB

There are two ways to interact with the tenant database:
the first is through `request.tenantDB` and the second is to extend the `RequestTenantRepository` as example below:

```js
class UserRepository extends RequestTenantRepository {
    private name = 'users';

    async create(user: User): Promise<boolean>{
        const query = SQL`
        INSERT INTO ${SQL.quoteIdent(this.name)} (id, first_name, last_name, email) 
        VALUES (${user.id},${user.firstName},${user.lastName},${user.email})
        `;

        const r = await this.db.query(query);

        return r.rowCount === 1;
    }

    async all(): Promise<any> {
        const query = SQL`SELECT * FROM ${SQL.quoteIdent(this.name)}`;

        const r = await this.db.query(query);

        return r.rows;
    }

    ...
}
```

## License

Licensed under [MIT](./LICENSE).<br/>
