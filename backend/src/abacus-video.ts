import { config } from './config.js'

type AbacusVideoRequest = {
  prompt: string
  imageUrl: string
}

type AbacusVideoResult = {
  status: 'prepared' | 'submitted' | 'ready'
  videoUrl: string | null
  jobId: string | null
}

export function hasAbacusVideoEndpoint() {
  return Boolean(config.abacusApiKey && config.abacusVideoEndpoint)
}

export function hasAbacusApiKey() {
  return Boolean(config.abacusApiKey)
}

export async function createAbacusVideoJob({ prompt, imageUrl }: AbacusVideoRequest): Promise<AbacusVideoResult> {
  if (!hasAbacusVideoEndpoint()) {
    return {
      status: 'prepared',
      videoUrl: null,
      jobId: null,
    }
  }

  const response = await fetch(config.abacusVideoEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.abacusApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.abacusVideoModel,
      modalities: ['video'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      video_config: {
        duration: config.abacusVideoDuration,
        aspect_ratio: '16:9',
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Abacus video request failed: ${response.status} ${detail}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  const videoUrl = readString(data, ['video_url', 'videoUrl', 'url', 'output_url'])
  const jobId = readString(data, ['job_id', 'jobId', 'id', 'deployment_token'])

  return {
    status: videoUrl ? 'ready' : 'submitted',
    videoUrl,
    jobId,
  }
}

function readString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.length > 0) return value
  }

  const output = data.output
  if (output && typeof output === 'object') {
    for (const key of keys) {
      const value = (output as Record<string, unknown>)[key]
      if (typeof value === 'string' && value.length > 0) return value
    }
  }

  const choices = data.choices
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== 'object') continue
      const message = (choice as Record<string, unknown>).message
      const value = readFromMessage(message, keys)
      if (value) return value
    }
  }

  return null
}

function readFromMessage(message: unknown, keys: string[]) {
  if (!message || typeof message !== 'object') return null

  const messageRecord = message as Record<string, unknown>
  for (const key of keys) {
    const value = messageRecord[key]
    if (typeof value === 'string' && value.length > 0) return value
  }

  const content = messageRecord.content
  if (typeof content === 'string') {
    const url = content.match(/https?:\/\/\S+\.(?:mp4|mov|webm)(?:\?\S+)?/i)?.[0]
    if (url) return url
  }

  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const partRecord = part as Record<string, unknown>
      for (const key of keys) {
        const value = partRecord[key]
        if (typeof value === 'string' && value.length > 0) return value
      }
      const video = partRecord.video
      if (video && typeof video === 'object') {
        for (const key of keys) {
          const value = (video as Record<string, unknown>)[key]
          if (typeof value === 'string' && value.length > 0) return value
        }
      }
    }
  }

  return null
}
