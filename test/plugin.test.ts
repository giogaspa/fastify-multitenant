'use strict'

import assert from "node:assert"
import test from "node:test"
import fastify, { FastifyRequest } from "fastify"

import fastifyMultitenant, { createTenantResourceConfig, FastifyMultitenantOptions, headerIdentifierStrategy } from '../src/index.js'
import { tenantConfigProviderFactory } from "../src/providers/tenant-config-provider.js"
import { tenantResourceProviderFactory } from "../src/providers/tenant-resource-provider.js"

declare module "fastify" {
    interface FastifyRequest {
        tenant: TenantResources
    }
}

type TenantConfig = {
    id: string
    name: string
    greetings: string[]
}

type TenantResources = {
    id: string
    greetingsProvider: ReturnType<typeof simpleGreetingsStorageFactory>
}

function testFactory(): { configurations: Map<string, TenantConfig>, options: FastifyMultitenantOptions<TenantConfig, TenantResources> } {
    const TENANT_CONFIGURATIONS = new Map<string, TenantConfig>([
        ['tenant1', { id: 'tenant1', name: 'Tenant 1', greetings: ['Hello', 'Hi'] }],
        ['tenant2', { id: 'tenant2', name: 'Tenant 2', greetings: ['Ciao', 'Buongiorno', 'Mandi'] }],
    ]);

    return {
        configurations: TENANT_CONFIGURATIONS,
        options: {
            tenantIdentifierStrategies: [
                headerIdentifierStrategy('X-TENANT-ID'),
            ],
            tenantConfigResolver: async (tenantId: string) => TENANT_CONFIGURATIONS.get(tenantId),
            resources: {
                ...createTenantResourceConfig<TenantConfig, TenantResources>({
                    name: 'id',
                    factory: async ({ tenantConfig }) => {
                        return tenantConfig.id;
                    }
                }),
                ...createTenantResourceConfig<TenantConfig, TenantResources>({
                    name: 'greetingsProvider',
                    factory: async ({ tenantConfig }) => {
                        return simpleGreetingsStorageFactory(...tenantConfig.greetings);
                    }
                }),
            }
        }
    }
}

test('Check tenant-specific responses', async () => {
    const app = fastify({ logger: false });

    const { configurations, options } = testFactory()

    await app.register(fastifyMultitenant, options);

    // Define a route to test tenant-specific greetings
    app.get<{
        Params: {
            id: string
        }
    }>('/greeting/:id', async (request, reply) => {
        const greetingId = parseInt(request.params.id);

        return request.tenant.greetingsProvider.get(greetingId);
    })

    await app.ready();

    // Test with all tenants
    const greetingId = 0
    const tenantIds = configurations.keys()

    for (const tenantId of tenantIds) {
        const res = await app.inject({
            method: 'GET',
            url: `/greeting/${greetingId}`,
            headers: {
                'X-TENANT-ID': tenantId
            }
        })

        assert.equal(
            res.payload,
            configurations.get(tenantId)!.greetings[greetingId],
            `Should return the correct greeting for the tenant "${tenantId}"`
        );
    }
})

function simpleGreetingsStorageFactory(...args: string[]) {
    const storage = new Map<number, string>(args.map((greeting, idx) => [idx, greeting]));

    return {
        get: (id: number) => storage.get(id),
    };
}

test('Check thread safe configuration initialization', async () => {
    const configProvider = tenantConfigProviderFactory<TenantConfig>(async (tenantId) => ({
        id: tenantId,
        name: `Tenant ${tenantId}`,
        greetings: ['Hello', 'Hi']
    }))

    // Concurrently request the same tenant configuration
    const [res1, res2] = await Promise.all([
        configProvider.get('tenant1'),
        configProvider.get('tenant1')
    ])

    // Should be the same instance
    assert.strictEqual(res1, res2)
})

test('Check thread safe resources initialization', async () => {
    const configProvider = tenantConfigProviderFactory<TenantConfig>(async (tenantId) => ({
        id: tenantId,
        name: `Tenant ${tenantId}`,
        greetings: ['Hello', 'Hi']
    }))

    const resourceProvider = tenantResourceProviderFactory<TenantConfig, TenantResources>({
        ...createTenantResourceConfig({
            name: 'id',
            factory: async ({ tenantConfig }) => {
                return tenantConfig.id;
            }
        }),
        ...createTenantResourceConfig({
            name: 'greetingsProvider',
            factory: async ({ tenantConfig }) => {
                return simpleGreetingsStorageFactory(...tenantConfig.greetings);
            }
        }),
    }, configProvider)

    // Concurrently request the same tenant resources
    const [res1, res2] = await Promise.all([
        resourceProvider.getAll('tenant1'),
        resourceProvider.getAll('tenant1'),
    ])

    // Should be the same instance
    assert.strictEqual(res1, res2)
})

test('Exclude route from multitenancy', async () => {
    const app = fastify({ logger: false });

    const { options } = testFactory()

    await app.register(fastifyMultitenant, options);

    // Define a route to test tenant-specific greetings
    app
        .get('/with-tenant', async (request) => {
            return request.tenant.id;
        })

    // Define an excluded route
    app
        .get('/without-tenant',
            {
                config: {
                    multitenant: {
                        exclude: true
                    }
                }
            },
            async (request) => {
                return request.tenant?.id ?? 'no-tenant';
            })

    await app.ready();

    // Test the excluded route without tenant header
    const withTenantRes = await app.inject({
        method: 'GET',
        url: `/with-tenant`,
        headers: {
            'X-TENANT-ID': 'tenant1'
        }
    })

    assert.equal(
        withTenantRes.body,
        'tenant1',
    );

    // Test the excluded route without tenant header
    const withoutTenantRes = await app.inject({
        method: 'GET',
        url: `/without-tenant`,
        headers: {
            'X-TENANT-ID': 'tenant1'
        }
    })

    assert.equal(
        withoutTenantRes.body,
        'no-tenant',
    );
})

test('Custom route tenant identification strategy', async () => {
    const app = fastify({ logger: false });

    const { options } = testFactory()
    const CUSTOM_TENANT_HEADER = 'X-CUSTOM-TENANT-ID';

    await app.register(fastifyMultitenant, options);

    // Define a route to test tenant-specific greetings
    app.get(
        '/current-tenant',
        {
            config: {
                multitenant: {
                    identifierStrategy: (request: FastifyRequest) => {
                        return request.headers[CUSTOM_TENANT_HEADER.toLocaleLowerCase()] as string | undefined;
                    }
                }
            }
        },
        async (request) => {
            return request.tenant.id;
        }
    )

    await app.ready();
    
    // Test the route with custom tenant header
    const res = await app.inject({
        method: 'GET',
        url: `/current-tenant`,
        headers: {
            'X-TENANT-ID': 'tenant1',
            [CUSTOM_TENANT_HEADER]: 'tenant2'
        }
    })

    assert.equal(
        res.body,
        'tenant2',
    );
})