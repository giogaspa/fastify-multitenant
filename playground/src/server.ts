import fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { app } from './app.js'

const LOGGER_CONFIGURATION = {
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
}

const PORT = 8888

async function start() {
  const server = fastify({
    logger: LOGGER_CONFIGURATION
  }).withTypeProvider<TypeBoxTypeProvider>()

  await server.register(app)

  await server.ready(() => {
    console.log('Server is ready')
    console.log(server.printRoutes())
  })


  server.listen(
    {
      port: PORT,
    },
    (err, address) => {
      if (err) {
        server.log.error(err)
        process.exit(1)
      }

      server.log.info(`Server listening at ${address}`)
    }
  )
}

start()