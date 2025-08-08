import { FastifyRequest } from "fastify"

import { IdentifierStrategyFactory } from "./types.js"

export const queryIdentifierStrategy: IdentifierStrategyFactory = (paramName: string) => {
    return (request: FastifyRequest) => {
        //request.log.debug("Run queryIdentifierStrategy")

        const { query } = request as { query?: Record<string, unknown> }

        if (
            !query
            || typeof query !== 'object'
            || !(paramName in query)
            || query[paramName] === ''
        ) {
            return undefined
        }

        return query[paramName] as string | undefined
    }
}