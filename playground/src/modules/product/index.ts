import { FastifyInstance, FastifyPluginAsync } from "fastify";

import { ProductsRepository } from "./repository.js";

export const ProductModule: FastifyPluginAsync = async function ProductModule(server: FastifyInstance) {
    const repository = new ProductsRepository()

    server.get('/products/random', async () => {
        return repository.getRandom()
    })

    server.get('/products/:id', async (request) => {
        const { id } = request.params as { id: string }

        return repository.getById(id)
    })

    server.get('/products', async () => {
        return repository.getAll()
    })
}