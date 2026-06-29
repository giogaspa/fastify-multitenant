'use strict'

import assert from "node:assert"
import test from "node:test"

import { headerIdentifierStrategy } from "../src/strategies/header-identifier-strategy.js"
import { queryIdentifierStrategy } from "../src/strategies/query-identifier-strategy.js"
import { FastifyRequest } from "fastify"

test('Header strategy', async () => {
    const TENANT_ID = 'tenant-test'
    const TENANT_HEADER = 'x-tenant-id'

    const strategy = headerIdentifierStrategy(TENANT_HEADER)

    const request: FastifyRequest = {
        headers: {
            [TENANT_HEADER]: TENANT_ID
        }
    } as any

    const resolvedTenantId = strategy(request)

    assert.strictEqual(resolvedTenantId, TENANT_ID, 'Should return the tenant ID from the header')
})

test('Header strategy - missing header', async () => {
    const TENANT_HEADER = 'x-tenant-id'

    const strategy = headerIdentifierStrategy(TENANT_HEADER)

    const request: FastifyRequest = {
        headers: {}
    } as any

    const resolvedTenantId = strategy(request)

    assert.strictEqual(resolvedTenantId, undefined, 'Should return undefined if the header is missing')
})

test('Header strategy - array header value', async () => {
    const TENANT_HEADER = 'x-tenant-id'

    const strategy = headerIdentifierStrategy(TENANT_HEADER)

    const request: FastifyRequest = {
        headers: {
            [TENANT_HEADER]: ['tenant1', 'tenant2']
        }
    } as any

    const resolvedTenantId = strategy(request)

    assert.strictEqual(resolvedTenantId, undefined, 'Should return undefined for a non-string (array) header value')
})

test('Query strategy', async () => {
    const TENANT_ID = 'tenant-test'
    const TENANT_PARAM = 'tenantId'

    const strategy = queryIdentifierStrategy(TENANT_PARAM)

    const request: FastifyRequest = {
        query: {
            [TENANT_PARAM]: TENANT_ID
        }
    } as any

    const resolvedTenantId = strategy(request)

    assert.strictEqual(resolvedTenantId, TENANT_ID, 'Should return the tenant ID from the query parameter')
})

test('Query strategy - missing parameter', async () => {
    const TENANT_PARAM = 'tenantId'

    const strategy = queryIdentifierStrategy(TENANT_PARAM)

    const request: FastifyRequest = {
        query: {}
    } as any

    const resolvedTenantId = strategy(request)

    assert.strictEqual(resolvedTenantId, undefined, 'Should return undefined if the query parameter is missing')
})

test('Query strategy - array parameter value', async () => {
    const TENANT_PARAM = 'tenantId'

    const strategy = queryIdentifierStrategy(TENANT_PARAM)

    const request: FastifyRequest = {
        query: {
            [TENANT_PARAM]: ['tenant1', 'tenant2']
        }
    } as any

    const resolvedTenantId = strategy(request)

    assert.strictEqual(resolvedTenantId, undefined, 'Should return undefined for a non-string (array) query parameter value')
})
