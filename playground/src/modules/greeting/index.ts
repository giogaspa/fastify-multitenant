import { FastifyInstance, FastifyPluginAsync } from "fastify";

import { GreetingsRepository } from "./repository.js";

export const GreetingModule: FastifyPluginAsync = async function GreetingModule(server: FastifyInstance) {
    const repository = new GreetingsRepository()

    server.get('/greetings/random', async () => {
        return repository.getRandom()
    })

    server.get('/greetings/:id', async (request) => {
        const { id } = request.params as { id: string }

        return repository.getById(parseInt(id))
    })

    server.get('/greetings', async () => {
        return repository.getAll()
    })
}