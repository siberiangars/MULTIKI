import 'dotenv/config'

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://multstudio:multstudio_dev_password@127.0.0.1:5432/multstudio',
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5',
  openaiImageSize: process.env.OPENAI_IMAGE_SIZE ?? '1536x1024',
  openaiImageQuality: process.env.OPENAI_IMAGE_QUALITY ?? 'medium',
  abacusApiKey: process.env.ABACUS_API_KEY ?? '',
  abacusVideoEndpoint: process.env.ABACUS_VIDEO_ENDPOINT ?? '',
  abacusVideoModel: process.env.ABACUS_VIDEO_MODEL ?? 'kling_ai_v26',
  abacusVideoDuration: Number(process.env.ABACUS_VIDEO_DURATION ?? 5),
}
