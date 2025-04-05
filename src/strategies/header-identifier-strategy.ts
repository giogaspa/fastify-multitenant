import { FastifyRequest } from "fastify"

import { IdentifierStrategyFactory } from "./types.js"

export const headerIdentifierStrategy: IdentifierStrategyFactory = (name: string) => {
    return (request: FastifyRequest) => {
        request.log.debug("Run headerIdentifierStrategy")
        
        const headerValue = request.headers[name.toLowerCase()]

        if (headerValue) {
            return headerValue as string | undefined
        }

        return undefined
    }
}