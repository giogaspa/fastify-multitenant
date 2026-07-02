'use strict'

import assert from "node:assert"
import test from "node:test"
import fastify, { FastifyRequest } from "fastify"

import fastifyMultitenant, { createTenantResourceConfig, FastifyMultitenantOptions, headerIdentifierStrategy, tenantResourcesContext } from '../src/index.js'

type TenantConfig = {
    id: string
    name: string
}

type TenantResources = {
    id: string
}

function testOptions(): FastifyMultitenantOptions<TenantConfig, TenantResources> {
    return {
        tenantIdentifierStrategies: [headerIdentifierStrategy('X-TENANT-ID')],
        tenantConfigResolver: async (tenantId: string) => ({ id: tenantId, name: `Tenant ${tenantId}` }),
        resources: {
            ...createTenantResourceConfig<TenantConfig, TenantResources>({
                name: 'id',
                factory: async ({ tenantConfig }) => tenantConfig.id,
            }),
        },
    }
}

// A service that reads the tenant resources from the ALS context, i.e. NOT from `request.tenant`.
async function readIdFromContext(): Promise<string | undefined> {
    return tenantResourcesContext.get('id') as string | undefined
}

test('ALS context reaches the handler on a GET request', async () => {
    const TENANT_ID = 'tenant1'
    const app = fastify({ logger: false })
    await app.register(fastifyMultitenant, testOptions())

    app.get('/ctx', async (request) => {
        const fromHandler = request.tenant.id
        const fromService = await readIdFromContext()
        return { fromHandler, fromService }
    })

    await app.ready()

    const res = await app.inject({
        method: 'GET',
        url: '/ctx',
        headers: { 'X-TENANT-ID': TENANT_ID },
    })

    const body = res.json()
    assert.equal(body.fromHandler, TENANT_ID, 'context must be readable from the handler (GET)')
    assert.equal(body.fromService, TENANT_ID, 'context must survive into a nested service call (GET)')

    await app.close()
})

test('ALS context reaches the handler on a POST request with a body', async () => {
    const TENANT_ID = 'tenant1'
    const app = fastify({ logger: false })
    await app.register(fastifyMultitenant, testOptions())

    app.post('/ctx', async (request: FastifyRequest) => {
        const fromRequest = request.tenant.id
        const fromService = await readIdFromContext()
        return { fromRequest, fromService }
    })

    const address = await app.listen({ port: 0, host: '127.0.0.1' })

    try {
        const res = await fetch(`${address}/ctx`, {
            method: 'POST',
            headers: { 'X-TENANT-ID': TENANT_ID, 'content-type': 'application/json' },
            body: JSON.stringify({ some: 'body' }),
        })

        const body = await res.json() as { fromService?: string, fromRequest?: string }
        assert.equal(body.fromRequest, TENANT_ID, 'sanity: the tenant was resolved for the POST request')
        assert.equal(body.fromService, TENANT_ID, 'context must survive into a nested service call (POST with body)')
    } finally {
        await app.close()
    }
})
