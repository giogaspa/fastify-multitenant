'use strict'

import assert from "node:assert"
import test from "node:test"
import fastify from "fastify"

import fastifyMultitenant, { createTenantResourceConfig, FastifyMultitenantOptions, headerIdentifierStrategy } from '../src/index.js'
import { tenantConfigProviderFactory } from "../src/providers/tenant-config-provider.js"

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

test('Check tenant-specific responses', async () => {
    const app = fastify({ logger: false });

    const tenantConfigs = new Map<string, any>([
        ['tenant1', { id: 'tenant1', name: 'Tenant 1', greetings: ['Hello', 'Hi'] }],
        ['tenant2', { id: 'tenant2', name: 'Tenant 2', greetings: ['Ciao', 'Buongiorno', 'Mandi'] }],
    ]);

    const options: FastifyMultitenantOptions<TenantConfig, TenantResources> = {
        tenantIdentifierStrategies: [
            headerIdentifierStrategy('X-TENANT-ID'),
        ],
        tenantConfigResolver: async (tenantId) => tenantConfigs.get(tenantId),
        resources: {
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
        }
    }

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
    const tenantIds = tenantConfigs.keys()

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
            tenantConfigs.get(tenantId).greetings[greetingId],
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