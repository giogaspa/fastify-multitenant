import { FastifyRequest } from "fastify"

import { IdentifierStrategyFactory } from "./types.js"

export const queryIdentifierStrategy: IdentifierStrategyFactory = (paramName: string) => {
    return (request: FastifyRequest) => {
        const { query } = request as { query?: Record<string, unknown> }

        if (!query) {
            return undefined
        }

        const paramValue = query[paramName]

        if (typeof paramValue !== 'string') {
            return undefined
        }

        return paramValue
    }
}