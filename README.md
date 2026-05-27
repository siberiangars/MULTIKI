# МультСтудия AI

Full-stack MVP сервиса для генерации персональных AI-мультфильмов по фото ребенка и текстовому брифу клиента.

## Что есть сейчас

- React + Vite + TypeScript frontend.
- Fastify API на Node.js.
- PostgreSQL для проектов, сцен и этапов производства.
- Redis + BullMQ worker для очереди генерации.
- Docker Compose для локального и серверного запуска.
- Nginx для web-контейнера и прокси `/api` в backend.
- Production-деплой на `multiki.v3techbots.online` через общий Caddy.

## Локальный запуск без Docker

```bash
npm install
npm run dev
```

Отдельно можно запускать backend:

```bash
npm run dev:api
npm run dev:worker
```

Vite проксирует `/api` и `/health` на `http://127.0.0.1:4000`.

## Проверки

```bash
npm run lint
npm run build
```

## Docker

```bash
docker compose up --build -d
```

Сервисы:

- Frontend: `http://127.0.0.1:8080`
- API: `http://127.0.0.1:4000`
- Health: `http://127.0.0.1:8080/health`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Production поддомен

Целевой поддомен: `multiki.v3techbots.online`.

DNS в Reg.ru:

```text
Тип: A
Имя: multiki
Значение: 178.105.255.47
TTL: 300
```

На чистом сервере:

```bash
docker compose -p multstudio -f docker-compose.prod.yml up --build -d
```

На текущем сервере, где уже есть общий Caddy в Docker-сети `shorts-factory_web`:

```bash
docker compose -p multstudio -f docker-compose.server.yml up --build -d
```

Блок в общем Caddyfile:

```caddy
multiki.v3techbots.online {
  encode zstd gzip

  handle /api/* {
    reverse_proxy multstudio-api:4000
  }

  handle /health {
    reverse_proxy multstudio-api:4000
  }

  handle {
    reverse_proxy multstudio-web:80
  }
}
```

## Следующий этап

1. Добавить авторизацию и личные кабинеты.
2. Добавить загрузку фото в object storage.
3. Подключить LLM для продюсерского сценария.
4. Подключить image generation и image-to-video провайдеров.
5. Подключить TTS и сборку MP4 через FFmpeg/Remotion.
6. Добавить оплату и лимиты подписки.
