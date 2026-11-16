// Email sign-in through the real form on a device; the account is credentials.reader.
import { describe } from '@e2e-dev/mobile';
import { credentials, expect } from 'e2e';
import { signedOutTest } from './support';

describe('sign-in', () => {
  signedOutTest('signs in with email and password and opens the shelf', async ({ app, screen }) => {
    const reader = credentials.user('reader');
    await app.open();
    await screen.getByTestId('signInEmail').waitFor({ timeout: 180_000 });

    await screen.getByTestId('signInEmail').fill(reader.username);
    await screen.getByTestId('signInPassword').fill(reader.password);
    await screen.getByTestId('signInSubmit').tap();

    await expect(screen.getByTestId('tab-shelf')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByTestId('shelf-status-READING')).toBeVisible();
  });
});
