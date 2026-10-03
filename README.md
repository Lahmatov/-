# Книжная полка

Как IMDb, только для книг: отмечаете «Начал читать» → «Закончил читать», ставите оценку 1–10 и пишете отзыв.
Отзывы других читателей видны на странице книги.

## Что уже есть

- **Вход** через Google или по email и паролю (Auth.js).
- **Каталог книг**: название, автор, год. Поиск сначала по своей базе, потом в Open Library (~30 млн книг) — найденное
  добавляется в каталог одной кнопкой. Если книги нет нигде — её можно добавить вручную (дубли отлавливаются).
- **Полка** со статусами: «Хочу прочитать», «Читаю», «Отложил», «Прочитал», «Бросил». Даты начала и окончания
  ставятся автоматически, их можно поправить.
- **Оценка и отзыв**, публичный или личный. Средняя оценка и число прочитавших на странице книги.
- **Импорт**: Kindle (`My Clippings.txt`), экспорт Goodreads, любой CSV с колонками `Title, Author, Year, Status`.

## Запуск

```bash
npm install
cp .env.example .env        # и впишите AUTH_SECRET (openssl rand -base64 32)
npx prisma db push          # создаёт базу SQLite
npm run db:seed             # ~150 книг для старта
npm run dev                 # http://localhost:3000
```

Наполнить каталог тысячами книг из Open Library:

```bash
npm run import:openlibrary                       # 19 тематик по 500 книг
PER_SUBJECT=2000 npm run import:openlibrary -- fantasy science_fiction
```

### Вход через Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create credentials → OAuth client ID → Web application.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (и такой же с вашим доменом).
3. Впишите `AUTH_GOOGLE_ID` и `AUTH_GOOGLE_SECRET` в `.env`. Без них кнопка Google просто не показывается.

### Продакшен

SQLite годится для разработки. Для сервера поменяйте в `prisma/schema.prisma` `provider = "postgresql"` и задайте
`DATABASE_URL` (Neon, Supabase, Railway и т. п.). Удобнее всего деплоить на Vercel.

## Стек

Next.js 15 (App Router, server actions) · Prisma · Auth.js v5 · Tailwind CSS 4 · Open Library API.

## Идеи на будущее

- Профили и лента друзей: подписки, «что читают те, на кого я подписан».
- Свои полки/списки, цели на год («50 книг в 2027»), статистика.
- iOS-приложение (React Native/Expo поверх этого же бэкенда) или PWA на домашний экран.
- Kindle: сейчас только через файл с устройства — у Amazon нет публичного API библиотеки.
- Apple Books: публичного API и экспорта нет, поэтому прямой синхронизации не будет; остаётся импорт через CSV.
- Подтверждение email и сброс пароля.
