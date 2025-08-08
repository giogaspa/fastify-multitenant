import { FastifyRequest } from "fastify"

import { IdentifierStrategyFactory } from "./types.js"

export const headerIdentifierStrategy: IdentifierStrategyFactory = (name: string) => {
    return (request: FastifyRequest) => {
        const headerValue = request.headers[name.toLowerCase()]

        if (headerValue) {
            return headerValue as string | undefined
        }

        return undefined
    }
}