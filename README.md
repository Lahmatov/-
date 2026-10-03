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
- **Умный поиск**: прощает опечатки («булгкаов», «достоевски идеот») и сортирует по релевантности — точное
  название выше, популярные книги выше.
- **Итоги года**: цель («прочитать 24 книги в 2026»), прогресс, график по месяцам, средняя оценка.
- **Защита входа**: после 10 неудачных попыток вход по этому email блокируется на 15 минут.
- **Импорт**: Kindle (`My Clippings.txt`), экспорт Goodreads, любой CSV с колонками `Title, Author, Year, Status`.

## Запуск

```bash
npm install
cp .env.example .env        # и впишите AUTH_SECRET (openssl rand -base64 32)
npx prisma db push          # создаёт базу SQLite
npm run db:seed             # ~150 книг для старта
npm run dev                 # http://localhost:3000
npm test                    # тесты поиска, импорта и ограничения попыток
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

## Деплой

Сервер собран в Docker-образ: SQLite хранится на томе `/data`, при старте схема базы обновляется сама,
а в пустой каталог добавляются стартовые книги. Одного сервера с SQLite хватит на тысячи пользователей.

### Свой VPS (Hetzner, Timeweb, DigitalOcean — от ~5 €/мес)

1. Купите VPS с Ubuntu, направьте A-запись домена (например, `books.example.com`) на его IP.
2. На сервере:
   ```bash
   curl -fsSL https://get.docker.com | sh
   git clone <этот репозиторий> bookshelf && cd bookshelf
   cp .env.example .env    # впишите AUTH_SECRET, DOMAIN=books.example.com, ключи Google/Apple
   docker compose up -d
   ```
3. Через минуту сайт откроется на `https://books.example.com` — сертификат HTTPS Caddy получает сам.
4. В iOS-приложении укажите этот адрес в `ios/Config/Release.xcconfig` (`API_BASE_URL`).

Обновление: `git pull && docker compose up -d --build`. Резервная копия базы:
`docker compose cp app:/data/bookshelf.db ./backup.db`.

### Railway / Render / Fly.io

Подойдёт любой хостинг Docker-образов с постоянным диском: подключите репозиторий, смонтируйте диск в `/data`,
задайте переменные из `.env.example`.

### Vercel

У Vercel нет постоянного диска, поэтому SQLite там не работает. Нужно поменять в `prisma/schema.prisma`
`provider = "postgresql"` и взять базу в Neon или Supabase. Ещё ограничитель попыток входа хранит счётчики в памяти
и на нескольких экземплярах сервера будет мягче.

## iOS-приложение

Нативное приложение на SwiftUI лежит в [`ios/`](ios/README.md) и работает с этим же сервером.

## JSON API (`/api/v1`)

Авторизация — заголовок `Authorization: Bearer <token>`. Токен выдают эндпоинты входа.

| Метод | Путь | Что делает |
| --- | --- | --- |
| POST | `/auth/register` | `{name, email, password}` → `{token, user}` |
| POST | `/auth/login` | `{email, password}` → `{token, user}` |
| POST | `/auth/apple` | `{identityToken, name?}` → `{token, user}` |
| POST | `/auth/google` | `{idToken}` → `{token, user}` |
| POST | `/auth/logout` | отзывает текущий токен |
| GET / DELETE | `/me` | профиль / удаление аккаунта со всеми данными |
| GET | `/search?q=` | `{local: Book[], openLibrary: Hit[]}` |
| POST | `/books` | ручное добавление `{title, author, year?}` → `{book, existing}` |
| POST | `/books/openlibrary` | сохранить результат Open Library в каталог |
| GET | `/books/:id` | `{book, myEntry, stats, reviews}` |
| GET | `/shelf?status=` | `{counts, items: [{book, entry}]}` |
| PUT | `/shelf/:bookId` | `{status}` — даты начала/окончания ставятся сами |
| PATCH | `/shelf/:bookId` | `{rating?, review?, isPublic, startedAt?, finishedAt?}` |
| DELETE | `/shelf/:bookId` | убрать с полки |
| GET | `/stats?year=` | итоги года: `{year, goal, readCount, byMonth[12], avgRating, readingNow, years}` |
| PUT | `/goal` | `{year, target}` — цель на год, `target: null` убирает её |
| POST | `/import` | multipart: `file` + `kind` (`kindle` \| `csv`) |

## Проверки

GitHub Actions на каждый PR: веб (типы, тесты, сборка) и iOS (сборка в Xcode и тесты в симуляторе на macOS).

## Стек

Next.js 15 (App Router, server actions) · Prisma · Auth.js v5 · Tailwind CSS 4 · Open Library API.

## Идеи на будущее

- Профили и лента друзей: подписки, «что читают те, на кого я подписан».
- Свои полки/списки, цели на год («50 книг в 2027»), статистика.
- Kindle: сейчас только через файл с устройства — у Amazon нет публичного API библиотеки.
- Apple Books: публичного API и экспорта нет, поэтому прямой синхронизации не будет; остаётся импорт через CSV.
- Подтверждение email и сброс пароля.
- Ограничитель попыток хранит счётчики в памяти процесса — при нескольких серверах перенести в Redis.
