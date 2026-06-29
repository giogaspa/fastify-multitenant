'use strict'

import assert from "node:assert"
import test from "node:test"
import { FastifyRequest } from "fastify"

import { identifyTenantFactory } from "../src/tenant-identification.js"
import { headerIdentifierStrategy } from "../src/strategies/header-identifier-strategy.js"
import { queryIdentifierStrategy } from "../src/strategies/query-identifier-strategy.js"

const request = {} as FastifyRequest

test('Custom strategy: tenant id is trimmed', async () => {
    const identify = identifyTenantFactory([() => '  acme  '])

    const tenantId = await identify(request)

    assert.strictEqual(tenantId, 'acme', 'Should trim the id returned by a custom strategy')
})

test('Custom strategy: whitespace-only id falls through to the next strategy', async () => {
    const identify = identifyTenantFactory([
        () => '   ',
        () => 'fallback',
    ])

    const tenantId = await identify(request)

    assert.strictEqual(tenantId, 'fallback', 'A whitespace-only id should not win; the next strategy should be tried')
})

test('Custom strategy: whitespace-only id with no fallback resolves to undefined', async () => {
    const identify = identifyTenantFactory([() => '   '])

    const tenantId = await identify(request)

    assert.strictEqual(tenantId, undefined, 'A whitespace-only id should resolve to undefined')
})

test('Header strategy through the pipeline: empty / whitespace value resolves to undefined', async () => {
    const TENANT_HEADER = 'x-tenant-id'
    const identify = identifyTenantFactory([headerIdentifierStrategy(TENANT_HEADER)])

    const empty = await identify({ headers: { [TENANT_HEADER]: '' } } as any)
    assert.strictEqual(empty, undefined, 'Empty header value should resolve to undefined')

    const whitespace = await identify({ headers: { [TENANT_HEADER]: '   ' } } as any)
    assert.strictEqual(whitespace, undefined, 'Whitespace-only header value should resolve to undefined')

    const padded = await identify({ headers: { [TENANT_HEADER]: '  tenant1  ' } } as any)
    assert.strictEqual(padded, 'tenant1', 'A padded header value should be trimmed')
})

test('Query strategy through the pipeline: empty / whitespace value resolves to undefined', async () => {
    const TENANT_PARAM = 'tenantId'
    const identify = identifyTenantFactory([queryIdentifierStrategy(TENANT_PARAM)])

    const empty = await identify({ query: { [TENANT_PARAM]: '' } } as any)
    assert.strictEqual(empty, undefined, 'Empty query value should resolve to undefined')

    const whitespace = await identify({ query: { [TENANT_PARAM]: '   ' } } as any)
    assert.strictEqual(whitespace, undefined, 'Whitespace-only query value should resolve to undefined')

    const padded = await identify({ query: { [TENANT_PARAM]: '  tenant1  ' } } as any)
    assert.strictEqual(padded, 'tenant1', 'A padded query value should be trimmed')
})
