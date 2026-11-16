// Doctor: the app starts, the browser drives it, and the signed-out landmark renders.
import { describe, expect, test } from 'e2e';

describe('smoke', () => {
  test('opens on the sign-in screen', async ({ app, screen }) => {
    await app.open();

    await expect(screen.getByTestId('signInEmail')).toBeVisible();
    await expect(screen.getByTestId('signInPassword')).toBeVisible();
    await expect(screen.getByTestId('signInSubmit')).toBeDisabled();
  });
});
