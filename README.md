# karkas_home
Сайт для строительства каркасных домов под ключ

## Структура

- `index.html` - главная страница landing page.
- `styles.css` - адаптивный дизайн.
- `main.js` - рендер проектов, галереи и базовая обработка форм.
- `data/projects.js` - fallback-данные проектов.
- `admin.html` - админка для добавления проектов, фото и планировок.
- `backend/server.js` - локальный запуск backend.
- `backend/app.js` - Express app для локального сервера и Vercel serverless.
- `backend/storage.js` - JSON/Postgres-хранилище.
- `backend/uploads.js` - local/Vercel Blob загрузка изображений.
- `api/index.js` - Vercel serverless entrypoint.
- `vercel.json` - rewrite `/api/*` на serverless backend.

## Запуск локально

```bash
npm install
npm start
```

Сайт будет доступен на `http://127.0.0.1:4173/`, админка - на
`http://127.0.0.1:4173/admin.html`.

## Админка проектов

Откройте `/admin.html`, зарегистрируйте первый email администратора, затем добавляйте
проекты, фотографии и планировки.

Локально данные хранятся в `backend/data/db.json`, загруженные файлы - в `uploads/`.

## Продакшен на Vercel

Backend готов к serverless-запуску через `api/index.js` и `vercel.json`.

Для постоянного хранения на Vercel подключите:

- Postgres/Neon/Supabase с переменной `DATABASE_URL`.
- Vercel Blob с переменной `BLOB_READ_WRITE_TOKEN`.

Задайте переменные окружения в Vercel Project Settings:

- `JWT_SECRET` - секрет подписи сессий.
- `ADMIN_INVITE_CODE` - код для регистрации дополнительных администраторов.
- `DATABASE_URL` - строка подключения к Postgres.
- `BLOB_READ_WRITE_TOKEN` - токен Vercel Blob для загрузки изображений.

Если `DATABASE_URL` не задан, backend использует локальный JSON-файл
`backend/data/db.json`. Если `BLOB_READ_WRITE_TOKEN` не задан, файлы сохраняются
локально в `uploads/`. Для Vercel production эти fallback-режимы не подходят,
потому что serverless-файловая система не хранит изменения постоянно.
