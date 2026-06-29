'use strict'

import assert from "node:assert"
import test from "node:test"
import fastify from "fastify"

import fastifyMultitenant, {
    createTenantResourceConfig,
    FastifyMultitenantOptions,
    headerIdentifierStrategy,
    TenantRequiredError,
    TenantConfigurationNotFound,
    TenantResourcesNotFound,
    TenantResourceCreateError,
} from '../src/index.js'

// Note: FastifyRequest.tenant is intentionally not augmented here. These tests exercise the error
// paths only — the route handlers never run (the identification hook throws first) — so they do not
// read request.tenant, avoiding a cross-file declaration-merge clash with plugin.test.ts.

type TenantConfig = {
    id: string
    name: string
}

type TenantResources = {
    id: string
}

const TENANT_CONFIGURATIONS = new Map<string, TenantConfig>([
    ['tenant1', { id: 'tenant1', name: 'Tenant 1' }],
])

function baseOptions(): FastifyMultitenantOptions<TenantConfig, TenantResources> {
    return {
        tenantIdentifierStrategies: [headerIdentifierStrategy('X-TENANT-ID')],
        tenantConfigResolver: async (tenantId: string) => TENANT_CONFIGURATIONS.get(tenantId),
        resources: {
            ...createTenantResourceConfig<TenantConfig, TenantResources>({
                name: 'id',
                factory: async ({ tenantConfig }) => tenantConfig.id,
            }),
        },
    }
}

test('Missing tenant id responds 400 (TenantRequiredError)', async () => {
    const app = fastify({ logger: false })
    await app.register(fastifyMultitenant, baseOptions())
    app.get('/', async () => 'ok')
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/' })

    assert.equal(res.statusCode, 400)
})

test('Unknown tenant responds 404 (TenantConfigurationNotFound)', async () => {
    const app = fastify({ logger: false })
    await app.register(fastifyMultitenant, baseOptions())
    app.get('/', async () => 'ok')
    await app.ready()

    const res = await app.inject({
        method: 'GET',
        url: '/',
        headers: { 'X-TENANT-ID': 'does-not-exist' },
    })

    assert.equal(res.statusCode, 404)
})

test('Resource factory error responds 500 (TenantResourceCreateError)', async () => {
    const app = fastify({ logger: false })
    await app.register(fastifyMultitenant, {
        tenantIdentifierStrategies: [headerIdentifierStrategy('X-TENANT-ID')],
        tenantConfigResolver: async (tenantId: string) => TENANT_CONFIGURATIONS.get(tenantId),
        resources: {
            ...createTenantResourceConfig<TenantConfig, TenantResources>({
                name: 'id',
                factory: async () => {
                    throw new Error('boom')
                },
            }),
        },
    })
    app.get('/', async () => 'ok')
    await app.ready()

    const res = await app.inject({
        method: 'GET',
        url: '/',
        headers: { 'X-TENANT-ID': 'tenant1' },
    })

    assert.equal(res.statusCode, 500)
})

test('Error classes are exported and instanceof-checkable in setErrorHandler', async () => {
    const app = fastify({ logger: false })
    await app.register(fastifyMultitenant, baseOptions())

    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof TenantRequiredError) {
            return reply.status(400).send({ error: 'tenant_required' })
        }
        if (error instanceof TenantConfigurationNotFound) {
            return reply.status(404).send({ error: 'tenant_not_found' })
        }
        return reply.status(500).send({ error: 'internal' })
    })

    app.get('/', async () => 'ok')
    await app.ready()

    const missing = await app.inject({ method: 'GET', url: '/' })
    assert.equal(missing.statusCode, 400)
    assert.deepEqual(missing.json(), { error: 'tenant_required' })

    const unknown = await app.inject({
        method: 'GET',
        url: '/',
        headers: { 'X-TENANT-ID': 'does-not-exist' },
    })
    assert.equal(unknown.statusCode, 404)
    assert.deepEqual(unknown.json(), { error: 'tenant_not_found' })
})

test('Exported error classes carry the expected statusCode', () => {
    assert.equal(new TenantRequiredError().statusCode, 400)
    assert.equal(new TenantConfigurationNotFound('tenant1').statusCode, 404)
    assert.equal(new TenantResourcesNotFound('tenant1').statusCode, 500)
    assert.equal(new TenantResourceCreateError('msg', 'resource').statusCode, 500)
})
