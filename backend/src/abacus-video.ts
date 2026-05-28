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
      model: config.abacusVideoModel || undefined,
      prompt,
      image_url: imageUrl,
      duration: config.abacusVideoDuration,
      aspect_ratio: '16:9',
      mode: 'image-to-video',
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

  return null
}
