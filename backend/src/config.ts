import 'dotenv/config'

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://multstudio:multstudio_dev_password@127.0.0.1:5432/multstudio',
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
}
