# Полка — мобильное приложение (iOS + Android)

React Native + Expo (SDK 58), TypeScript, Expo Router. Один код для iPhone и Android; сервер — корень репозитория
(`app/api/v1`).

## Запуск

```bash
cd mobile
npm ci
npx expo start            # Expo Go / dev build; сервер по умолчанию http://localhost:3000
npm run typecheck && npm test
npm run export            # проверка, что JS-бандлы iOS и Android собираются
```

Нативные папки `ios/` и `android/` не хранятся в git: их генерирует Expo (Continuous Native Generation) из
`app.config.ts` и плагинов. Сборки и TestFlight / Google Play — через EAS (`eas.json`, раздел «Сборка»).

Переменные сборки (см. `app.config.ts`): `API_BASE_URL`, `APP_BUNDLE_ID`, `GOOGLE_IOS_CLIENT_ID`,
`GOOGLE_WEB_CLIENT_ID`, `EAS_PROJECT_ID`.

## Устройство кода

- `src/app/` — только маршруты (каждый файл — экран). `sign-in.tsx` — вход; `(app)/` — всё после входа
  (защищено `Stack.Protected`): `(app)/(tabs)/` — вкладки Полка, Поиск, Лента, Итоги, Профиль; остальные экраны
  открываются поверх вкладок. Модальные экраны объявлены в `(app)/_layout.tsx`.
- `src/lib/routes.ts` — пути всех экранов. Экраны ссылаются друг на друга только через `routes.*`
  (`router.push(routes.book(id))`).
- `src/api/` — `models.ts` (типы JSON сервера, даты — строки ISO), `client.ts` (`APIClient`), `offline.ts`
  (офлайн-копии GET-ответов и очередь изменений), `dates.ts`, `isbn.ts`.
- `src/auth/` — `AuthContext` (`useAuth()`, `useAPI()`), хранение токена (SecureStore), вход через Google.
- `src/components/` — `ui.tsx` (Screen, Section, Row, LabelRow, SwitchRow, Field, Button, Loaded, Empty,
  Segmented, Caption/Body/Headline), `BookCover`, `BookRow`, `RatingPicker`, `ProgressBar`, `OfflineBanner`,
  `theme.ts` (`useTheme()` — светлая/тёмная тема).
- `src/features/<раздел>/` — компоненты раздела, которые используются на нескольких экранах.
- `src/lib/` — `useLoad` (загрузка данных экрана), `alerts` (`attempt`, `confirm`, `showError`), `push`.
- `src/i18n/` — `L("русский текст", ...args)`; английский перевод — `src/i18n/en.json` (ключ — русский текст).

## Правила

- Строки интерфейса — по-русски через `L()`; для новой строки добавить английский перевод в `en.json`.
- Офлайн: GET без сети отдаёт сохранённую копию; изменения полки, прогресса и цитат при обрыве связи
  встают в очередь (`APIError` с `kind: "queued"`). `attempt(action, onQueued)` не считает это ошибкой —
  в `onQueued` обновите экран так, будто изменение применено.
- Платформенные различия — через `Platform.OS` (вход через Apple только на iOS, push пока только на iOS).
- Тесты — `__tests__/*.test.ts(x)` (jest-expo). Логика без интерфейса (модели, клиент, офлайн) покрыта тестами.

## Настройки сборки

Локально — переменные окружения перед `npx expo start` / `npx expo prebuild` (или файл `mobile/.env.local`, он в .gitignore):

```
API_BASE_URL=http://192.168.1.10:3000      # на телефоне — IP компьютера в локальной сети; сервер: npm run dev -- -H 0.0.0.0
APP_BUNDLE_ID=com.yourname.bookshelf
GOOGLE_IOS_CLIENT_ID=1234-abc.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=1234-web.apps.googleusercontent.com
```

Нативные модули (камера, вход через Apple/Google, push) не работают в Expo Go — нужна dev-сборка:
`npx expo run:ios` (Mac с Xcode) или `npx expo run:android` (Android Studio / SDK).

## Вход через Apple и Google

- **Apple** (только iOS): в Apple Developer у App ID включите *Sign in with Apple*; на сервере `APPLE_BUNDLE_ID=<Bundle ID>`.
- **Google**: в [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (тот же проект, что для веб-входа)
  создайте OAuth Client ID типа **iOS** (Bundle ID), типа **Android** (package + SHA-1 ключа подписи) и используйте
  существующий **Web** Client ID. В приложение: `GOOGLE_IOS_CLIENT_ID` и `GOOGLE_WEB_CLIENT_ID`. На сервере в
  `AUTH_GOOGLE_IOS_CLIENT_ID` перечислите через запятую iOS Client ID и Web Client ID (ID-токены Android приходят с
  аудиторией Web Client ID). Пока Client ID не задан, кнопка Google скрыта.

## Выпуск

Сборки делает GitHub Actions, аккаунт Expo не нужен. Номер сборки — номер запуска workflow.

**TestFlight** (`.github/workflows/testflight.yml`, вручную или тегом `v*`): `expo prebuild` → архив Xcode с
автоматической подписью через ключ App Store Connect API → загрузка. Один раз:
1. Платный аккаунт Apple Developer; в App Store Connect создайте приложение со своим Bundle ID.
2. Users and Access → Integrations → App Store Connect API → ключ с ролью **Admin**; скачайте `.p8`.
3. Секреты репозитория (Settings → Secrets and variables → Actions): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`
   (содержимое `.p8`), `APPLE_TEAM_ID`, `APP_BUNDLE_ID`, `API_BASE_URL` (только `https://`), необязательно
   `GOOGLE_IOS_CLIENT_ID`.
4. На сервере для сборок из TestFlight: `APNS_PRODUCTION=true`.

**Google Play** (`.github/workflows/android-release.yml`, вручную или тегом `v*`): подписанный AAB в артефактах запуска;
загрузить в Play Console вручную. Один раз: создайте ключ подписи
(`keytool -genkeypair -v -keystore release.keystore -alias polka -keyalg RSA -keysize 2048 -validity 10000`) и
секреты `ANDROID_KEYSTORE_BASE64` (`base64 -w0 release.keystore`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`, плюс `APP_BUNDLE_ID`, `API_BASE_URL`, необязательно `GOOGLE_WEB_CLIENT_ID`. Ключ храните вне
репозитория: без него не выпустить обновление.

Перед публикацией: вход через Apple обязателен при входе через Google (App Store 4.8) — есть; удаление аккаунта
(5.1.1(v)) — в «Профиле»; нужна ссылка на политику конфиденциальности.

## E2E-тесты

Сквозные тесты на фреймворке [e2e](https://github.com/e2e-inc/e2e): тест открывает приложение, нажимает кнопки и
проверяет экран. Тесты — `e2e/tests/`, настройки — `e2e.config.ts` (веб) и `e2e.native.config.ts` (iOS / Android).

**Веб (запускается где угодно).** Тот же код приложения в Chromium через react-native-web (экран 390×844, русский
язык). Нужны база, каталог и сборка сервера:

```bash
docker compose -f docker-compose.dev.yml up -d        # в корне репозитория
npx prisma db push && npm run db:seed && npm run build # в корне
cd mobile && npm ci
npx @e2e-dev/web install chromium                     # один раз
npm run test:e2e                                      # все веб-тесты; один файл: npx e2e run e2e/tests/web/search.e2e.ts
```

Запуск сам поднимает сервер API на `:3100` (если он не запущен), собирает веб-версию (`dist-web/`) и отдаёт её на
`http://127.0.0.1:8091` вместе с `/api` — см. `e2e/serve-web.mjs`. Тестовый аккаунт `e2e-reader@example.test`
создаётся при первом запуске (`e2e/reader.ts`; в CI и на общей базе — переменные `E2E_USER_READER_USERNAME`,
`E2E_USER_READER_PASSWORD`). Для веба токен хранится в `localStorage` (`src/auth/storage.web.ts`; на телефоне —
по-прежнему Keychain / Keystore).

**Шаги с ИИ-агентом.** Часть тестов описывает действие словами (`agent.act`, `agent.assert`); их выполняет Claude Code
со своим входом (`claude` залогинен, или `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_API_KEY`). Записанные действия лежат в
`.e2e/cache/` (хранится в git), и повторные запуски, в том числе в CI, проигрывают их без агента. Новый или
изменённый шаг записывается при первом запуске с агентом — файл из `.e2e/cache/` коммитится вместе с тестом.
`agent.assert` обращается к агенту каждый раз, поэтому в CI без секрета `CLAUDE_CODE_OAUTH_TOKEN` этот тест
пропускается.

**iOS и Android.** `npm run test:e2e:native -- --target ios` (или `android`) на Mac с запущенным симулятором (Android —
эмулятор и `adb reverse tcp:3000 tcp:3000`, `adb reverse tcp:8081 tcp:8081`), где установлена Debug-сборка; сервер
API на `:3000` и Metro поднимает `e2e/serve-native.mjs`. Полный рецепт — workflow `.github/workflows/e2e.yml`
(задачи `e2e — iOS simulator`, `e2e — Android emulator`).

**Результаты:** `.e2e/report.json`, при ошибке — `.e2e/results/<тест>/trace.md` (экран в момент ошибки, шаги, логи),
лог сервера — `.e2e/logs/app.log`. Всё, кроме `.e2e/cache/`, в git не попадает.

**Скилл проверки для агентов:** `.agents/skills/verify-polka/` (в Claude Code — `/verify-polka`): как запустить
приложение, проверить, что оно живо, доказать изменение и где лежат доказательства; `features/` — карта функций с
тестами и заданиями для баг-баша.

## Ещё не перенесено из SwiftUI-версии

- Виджет на главном экране (iOS WidgetKit / Android App Widget) — отдельная задача.
- Push на Android: сервер пока отправляет только через APNs; нужен FCM на сервере и `google-services.json`.
