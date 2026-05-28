import { config } from './config.js'

type AbacusImageResponse = {
  choices?: Array<{
    message?: {
      images?: Array<{
        image_url?: {
          url?: string
        }
        url?: string
      }>
      content?: unknown
    }
  }>
  error?: {
    message?: string
  }
}

export function hasAbacusImages() {
  return Boolean(config.abacusApiKey && config.abacusImageEndpoint)
}

export async function generateAbacusImage(prompt: string) {
  if (!hasAbacusImages()) {
    throw new Error('ABACUS_API_KEY is not configured')
  }

  const response = await fetch(config.abacusImageEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.abacusApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.abacusImageModel,
      modalities: ['image'],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const payload = (await response.json()) as AbacusImageResponse

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Abacus image request failed with ${response.status}`)
  }

  const image = payload.choices?.[0]?.message?.images?.[0]
  const imageUrl = image?.image_url?.url ?? image?.url

  if (imageUrl) return imageUrl

  throw new Error('Abacus image response did not include an image')
}
