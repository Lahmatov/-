# Sign-in

Email + password sign-in and registration on one screen; Apple (iOS only) and Google (when a client id is
configured) buttons. Signed out, every route lands on `/sign-in`.

## Sub-features

- Segmented «Вход» / «Регистрация»; registration adds «Имя» and needs a password of 8+ characters.
- `signInSubmit` («Войти» / «Создать аккаунт») is disabled until the email has `@` (and the other rules).
- «Забыли пароль?»: an alert / prompt that sends a reset link (the dev server only logs the email).
- After sign-in the token is stored (Keychain / Keystore on devices, `localStorage.apiToken` on web) and the
  shelf (`/`) opens.

## How to get to it (user POV)

Launch the app signed out. Account: `credentials.reader` (`e2e/reader.ts`), registered by the server scripts.

## Driving it with e2e

`web/smoke.e2e.ts` (form renders, submit disabled), `web/sign-in.e2e.ts` (real sign-in → shelf),
`web/sign-in-screen.e2e.ts` (`agent.assert` on the screen; skipped in CI without a Claude login),
`native/*.e2e.ts` (same on devices). Locators: `getByTestId('signInEmail' | 'signInPassword' | 'signInSubmit')`;
signed in: `getByTestId('shelf')`, `getByTestId('tab-shelf')`.

## Proof

`shelf` and `tab-shelf` visible after tapping `signInSubmit`; `localStorage.apiToken` set (web); the server
answers `GET /api/v1/me` with that token.

## Charters

```
sign-in-errors|web|fuzzer|Starting at /sign-in signed out, try a wrong password, an unknown email, a malformed email, and a short registration password; report errors that are missing, misleading, untranslated, or leak whether an account exists
```

## Gotchas

- Apple and Google buttons are absent on web and in CI (no Apple device / no Google client id): not a bug.
- The `reader` account existing is expected; registration with its email answers 409.
- Login and registration are rate-limited per IP (registration: 10 per 15 min); a bash that registers in a loop
  gets HTTP 429 «Слишком много попыток».
