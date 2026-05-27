import { config } from './config.js'

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string
    url?: string
  }>
  error?: {
    message?: string
  }
}

export function hasOpenAIImages() {
  return Boolean(config.openaiApiKey)
}

export async function generateImage(prompt: string) {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiImageModel,
      prompt,
      size: config.openaiImageSize,
      quality: config.openaiImageQuality,
      n: 1,
    }),
  })

  const payload = (await response.json()) as OpenAIImageResponse

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI image request failed with ${response.status}`)
  }

  const image = payload.data?.[0]

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`
  }

  if (image?.url) {
    return image.url
  }

  throw new Error('OpenAI image response did not include an image')
}
