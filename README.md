# МультСтудия AI

MVP сервиса для генерации персональных AI-мультфильмов по фото ребенка и текстовому брифу клиента.

## Что есть сейчас

- React + Vite + TypeScript frontend.
- Рабочий экран production console: фото, сценарный бриф, этапы генерации, раскадровка, тарифы.
- Локальная симуляция генерационного пайплайна.
- Production Docker image через nginx.
- Docker Compose с заготовкой под `web`, `postgres`, `redis`.

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://127.0.0.1:5173`.

## Проверки

```bash
npm run lint
npm run build
```

## Docker

```bash
docker compose up --build
```

Frontend будет доступен на `http://127.0.0.1:8080`.

Сервисы разработки:

- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Следующий этап

1. Добавить backend API.
2. Подключить PostgreSQL-схему проектов, пользователей, сцен и assets.
3. Добавить Redis/BullMQ очередь генерации.
4. Интегрировать AI-провайдеры: сценарий, image generation, image-to-video, TTS.
5. Собрать финальный MP4 через FFmpeg или Remotion.
