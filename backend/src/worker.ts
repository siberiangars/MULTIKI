import { Worker } from 'bullmq'
import { config } from './config.js'
import { closeDb, migrate } from './db.js'
import { connection } from './queue.js'
import { stageTemplates } from './domain.js'
import { updateProjectStatus, updateStage } from './projects.js'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

await migrate()

const worker = new Worker(
  'generation',
  async (job) => {
    const projectId = String(job.data.projectId)

    await updateProjectStatus(projectId, 'generating')

    for (const [stageIndex, stage] of stageTemplates.entries()) {
      await updateStage(projectId, stage.slug, 0, 'active')

      for (const progress of [24, 48, 76, 100]) {
        await sleep(config.nodeEnv === 'production' ? 1200 : 350)
        await updateStage(projectId, stage.slug, progress, progress === 100 ? 'done' : 'active')
        await job.updateProgress(Math.round(((stageIndex + progress / 100) / stageTemplates.length) * 100))
      }
    }

    await updateProjectStatus(projectId, 'ready')
  },
  {
    connection,
    concurrency: 2,
  },
)

worker.on('completed', (job) => {
  console.log(`Generation job ${job.id} completed`)
})

worker.on('failed', async (job, error) => {
  console.error(`Generation job ${job?.id ?? 'unknown'} failed`, error)
  if (job?.data.projectId) {
    await updateProjectStatus(String(job.data.projectId), 'failed')
  }
})

const shutdown = async () => {
  await worker.close()
  await closeDb()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
