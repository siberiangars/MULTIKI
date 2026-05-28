import { config } from './config.js'
import { generateAbacusImage, hasAbacusImages } from './abacus-images.js'
import { generateImage as generateOpenAIImage, hasOpenAIImages } from './openai-images.js'

type GeneratedImage = {
  url: string
  provider: string
}

export function hasImageProvider() {
  return hasAbacusImages() || hasOpenAIImages()
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  if (config.imageProvider === 'abacus') {
    if (hasAbacusImages()) {
      return {
        url: await generateAbacusImage(prompt),
        provider: `abacus:${config.abacusImageModel}`,
      }
    }

    if (hasOpenAIImages()) {
      return {
        url: await generateOpenAIImage(prompt),
        provider: `openai:${config.openaiImageModel}`,
      }
    }
  }

  if (hasOpenAIImages()) {
    return {
      url: await generateOpenAIImage(prompt),
      provider: `openai:${config.openaiImageModel}`,
    }
  }

  if (hasAbacusImages()) {
    return {
      url: await generateAbacusImage(prompt),
      provider: `abacus:${config.abacusImageModel}`,
    }
  }

  throw new Error('No image provider is configured')
}
