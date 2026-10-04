# Книжная полка — iOS

Нативное приложение на SwiftUI (iOS 17+). Работает с тем же сервером, что и сайт, через JSON API `/api/v1`.

**Экраны:** вход (Apple, Google, email) · «Мои книги» по статусам · поиск по каталогу и Open Library ·
карточка книги с кнопками «Начал читать» / «Закончил» / «Отложить», оценкой 1–10, датами и отзывом ·
ручное добавление книги · итоги года с целью и графиком по месяцам · профиль с импортом Kindle/CSV, выходом и удалением аккаунта.

## Запуск в симуляторе

Нужен Mac с Xcode 15+.

```bash
# 1. Сервер (в корне репозитория)
npm install && cp .env.example .env   # впишите AUTH_SECRET
npx prisma db push && npm run db:seed
npm run dev

# 2. Приложение
brew install xcodegen
cd ios
xcodegen                 # создаёт Bookshelf.xcodeproj из project.yml
open Bookshelf.xcodeproj
```

В Xcode выберите симулятор iPhone и нажмите ⌘R. Симулятор видит сервер на Mac как `localhost:3000` —
это значение уже стоит в `Config/Debug.xcconfig`. Вход по email работает сразу.

Тесты: ⌘U (декодирование ответов сервера, логика статусов, склонения).

## Личные настройки

Создайте `ios/Config/Local.xcconfig` (он в .gitignore) и переопределите нужное:

```
DEVELOPMENT_TEAM = ABCDE12345
APP_BUNDLE_ID = com.yourname.bookshelf
API_BASE_URL = http:/$()/192.168.1.10:3000
GOOGLE_CLIENT_ID = 1234-abc.apps.googleusercontent.com
GOOGLE_REVERSED_CLIENT_ID = com.googleusercontent.apps.1234-abc
```

После изменения `project.yml` снова запустите `xcodegen`. Изменения в xcconfig подхватываются сразу.

## На своём iPhone

- `API_BASE_URL` — IP Mac в локальной сети (`ipconfig getifaddr en0`), а сервер запускайте как `npm run dev -- -H 0.0.0.0`.
- **Sign in with Apple** требует платного Apple Developer Program. С бесплатной Personal Team уберите блок
  `entitlements` из `project.yml` и перезапустите `xcodegen` — останутся вход по email и через Google.

## Вход через Apple

1. В [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) включите
   у App ID возможность *Sign in with Apple*.
2. На сервере в `.env`: `APPLE_BUNDLE_ID=<ваш Bundle ID>`.

## Вход через Google

1. В [Google Cloud Console](https://console.cloud.google.com/apis/credentials) создайте OAuth Client ID типа **iOS**
   с вашим Bundle ID. Используйте тот же проект Google Cloud, что и для веб-входа: тогда один и тот же
   Google-аккаунт будет одним пользователем и на сайте, и в приложении.
2. В `Local.xcconfig`: `GOOGLE_CLIENT_ID` и `GOOGLE_REVERSED_CLIENT_ID` (iOS URL scheme из консоли).
3. На сервере в `.env`: `AUTH_GOOGLE_IOS_CLIENT_ID=<тот же Client ID>`.

Пока `GOOGLE_CLIENT_ID` пустой, кнопка Google в приложении скрыта.

## Перед публикацией в App Store

- `API_BASE_URL` в `Config/Release.xcconfig` — адрес сервера с HTTPS.
- Вход через Apple обязателен, если в приложении есть вход через Google (правило App Store 4.8). Он уже сделан.
- Удаление аккаунта из приложения обязательно (правило 5.1.1(v)). Оно в «Профиле».
- Нужна ссылка на политику конфиденциальности.

## Тесты

`xcodebuild test` (или ⌘U) запускает юнит-тесты (`BookshelfTests`) и UI-тесты (`BookshelfUITests`).
UI-тесты запускают приложение с аргументом `-ui-testing`: оно говорит с подставным сервером
(`App/UITestSupport.swift`, только в Debug), поэтому настоящий сервер и сеть не нужны. Сценарии: вход с ошибкой,
полка → книга → новая цитата, челленджи и клубы, полоска «нет сети».

## Офлайн-режим

Последние ответы сервера сохраняются на телефоне (`OfflineStore`): без сети полка, книги, цитаты и итоги
открываются из этой копии, а обложки — из дискового кэша Nuke. Изменения без сети (статус, отзыв,
прогресс, цитаты, удаление с полки) встают в очередь и отправляются по порядку, когда появляется сеть
или приложение снова открывают. Сверху показывается полоска «Нет сети» и число неотправленных изменений.
При выходе из аккаунта копии и очередь стираются.

## Устройство кода

```
Bookshelf/
  App/          точка входа, корневой экран и вкладки, конфигурация
  Models/       модели ответов API, статусы и доступные из них действия
  Networking/   APIClient (async/await + URLSession), Keychain, разбор дат
  Auth/         AuthStore (токен в Keychain), экран входа, Google Sign-In
  Shelf/        «Мои книги»
  Search/       поиск по каталогу и Open Library
  Books/        карточка книги, оценка и отзыв, добавление книги
  Stats/        итоги года: цель, прогресс, график (Swift Charts)
  Profile/      профиль, импорт, выход, удаление аккаунта
```
