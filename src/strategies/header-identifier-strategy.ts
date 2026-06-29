import { FastifyRequest } from "fastify"

import { IdentifierStrategyFactory } from "./types.js"

export const headerIdentifierStrategy: IdentifierStrategyFactory = (name: string) => {
    const lowerCaseName = name.toLowerCase()

    return (request: FastifyRequest) => {
        const headerValue = request.headers[lowerCaseName]

        if (typeof headerValue !== "string") {
            return undefined
        }

        return headerValue
    }
}