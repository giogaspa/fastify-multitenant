# :construction: @giogaspa/fastify-multitenant :construction:

---
**NOTE**

This is a work in progress, please look at the develop branch for ongoing development.

---

 Multitenant plugin for Fastify.

 Supports Fastify versions `4.x`

## Install
```
npm i @giogaspa/fastify-multitenant
```

## Usage
Require `@giogaspa/fastify-multitenant` and register.
```js
const fastify = require('fastify')();
const { PostgreSQLRepository, HostnameResolver, HttpHeaderResolver } = require("@giogaspa/fastify-multitenant");

// Instantiate admin repository
const pgAdminRepository = new PostgreSQLRepository({ config: { connectionString: "postgresql://postgres:1234@localhost:5432/postgres?schema=public" } });
//const jsonAdminRepository = new JsonRepository(join(__dirname, '..','.tenants.json'));
//const inMemoryAdminRepository = new InMemoryRepository();

fastify.register(require('@giogaspa/fastify-multitenant'), {
    adminHost: 'admin.domain.tld', // Admin host domain
    tenantRepository: pgAdminRepository, // Repository to retrieve tenant connection information. 
    resolverStrategies: [ // Strategies to recognize the tenant
        HostnameResolver, // Hostname strategy
        {
            classConstructor: HttpHeaderResolver, // Header parameter strategy
            config: {
                header: 'x-tenant',
            }
        }
    ]
})

fastify.listen({ port: 3000 })
```

## License

Licensed under [MIT](./LICENSE).<br/>
