import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { config } from './config.js'
import { closeDb, migrate } from './db.js'
import { closeQueue, generationQueue } from './queue.js'
import { createProject, getProject, listProjects, resetProduction } from './projects.js'
import { defaultBrief } from './domain.js'

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: true,
})

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'ValidationError',
      issues: error.issues,
    })
  }

  app.log.error(error)
  return reply.status(500).send({ error: 'InternalServerError' })
})

app.get('/health', async () => ({
  ok: true,
  service: 'multstudio-api',
}))

app.get('/api/projects', async () => ({
  projects: await listProjects(),
}))

app.post('/api/projects', async (request, reply) => {
  const project = await createProject(request.body ?? defaultBrief)
  return reply.status(201).send({ project })
})

app.get('/api/projects/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const project = await getProject(id)

  if (!project) {
    return reply.status(404).send({ error: 'ProjectNotFound' })
  }

  return { project }
})

app.post('/api/projects/:id/generate', async (request, reply) => {
  const { id } = request.params as { id: string }
  const project = await getProject(id)

  if (!project) {
    return reply.status(404).send({ error: 'ProjectNotFound' })
  }

  await resetProduction(id)
  const job = await generationQueue.add('generate-project', { projectId: id })
  return reply.status(202).send({ jobId: job.id })
})

const shutdown = async () => {
  await app.close()
  await closeQueue()
  await closeDb()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await migrate()
await app.listen({ port: config.port, host: config.host })
