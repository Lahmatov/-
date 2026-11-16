// Email sign-in through the real form; the account is credentials.reader (registered by e2e/serve-web.mjs).
import { credentials, describe, expect, test } from 'e2e';

describe('sign-in', () => {
  test('signs in with email and password and opens the shelf', async ({ app, screen }) => {
    const reader = credentials.user('reader');
    await app.open();

    await screen.getByTestId('signInEmail').fill(reader.username);
    await screen.getByTestId('signInPassword').fill(reader.password);
    await screen.getByTestId('signInSubmit').tap();

    await expect(screen.getByTestId('shelf')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByTestId('tab-shelf')).toBeVisible();
    await expect(screen.getByTestId('shelf-status-READING')).toBeVisible();
  });
});
