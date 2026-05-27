import { Queue, type ConnectionOptions } from 'bullmq'
import { config } from './config.js'

export const connection: ConnectionOptions = {
  url: config.redisUrl,
  maxRetriesPerRequest: null,
}

export const generationQueue = new Queue('generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
})

export async function closeQueue() {
  await generationQueue.close()
}
