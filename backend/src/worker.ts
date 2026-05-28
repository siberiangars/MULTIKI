import { Worker } from 'bullmq'
import { config } from './config.js'
import { closeDb, migrate } from './db.js'
import { connection } from './queue.js'
import { createImagePrompt, createVideoPrompt, stageTemplates } from './domain.js'
import { createAbacusVideoJob, hasAbacusApiKey } from './abacus-video.js'
import { generateImage, hasOpenAIImages } from './openai-images.js'
import {
  getProject,
  listScenesForProject,
  updateProjectStatus,
  updateSceneImage,
  updateSceneVideo,
  updateStage,
} from './projects.js'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

await migrate()

const worker = new Worker(
  'generation',
  async (job) => {
    const projectId = String(job.data.projectId)

    await updateProjectStatus(projectId, 'generating')

    for (const [stageIndex, stage] of stageTemplates.entries()) {
      await updateStage(projectId, stage.slug, 0, 'active')

      if (stage.slug === 'frames') {
        await generateSceneFrames(projectId)
      }

      if (stage.slug === 'animation') {
        await generateSceneVideos(projectId)
      }

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

async function generateSceneFrames(projectId: string) {
  if (!hasOpenAIImages()) return

  const project = await getProject(projectId)
  if (!project) return

  const scenes = await listScenesForProject(projectId)

  for (const scene of scenes) {
    try {
      await updateSceneImage(scene.id, scene.image_url, 'openai', 'generating')
      const prompt = createImagePrompt(scene.prompt, project.brief)
      const imageUrl = await generateImage(prompt)
      await updateSceneImage(scene.id, imageUrl, 'openai', 'ready')
    } catch (error) {
      console.error(`Scene image generation failed for ${scene.id}`, error)
      await updateSceneImage(scene.id, scene.image_url, 'openai', 'failed')
    }
  }
}

async function generateSceneVideos(projectId: string) {
  if (!hasAbacusApiKey()) return

  const project = await getProject(projectId)
  if (!project) return

  const scenes = await listScenesForProject(projectId)

  for (const scene of scenes) {
    if (!scene.image_url) {
      await updateSceneVideo(scene.id, scene.video_url, 'abacus', 'waiting_for_image', scene.video_prompt, null)
      continue
    }

    const prompt = createVideoPrompt(scene.prompt, project.brief)

    try {
      await updateSceneVideo(scene.id, scene.video_url, 'abacus', 'generating', prompt, null)
      const result = await createAbacusVideoJob({ prompt, imageUrl: scene.image_url })
      await updateSceneVideo(scene.id, result.videoUrl, 'abacus', result.status, prompt, result.jobId)
    } catch (error) {
      console.error(`Scene video generation failed for ${scene.id}`, error)
      await updateSceneVideo(scene.id, scene.video_url, 'abacus', 'failed', prompt, null)
    }
  }
}

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
