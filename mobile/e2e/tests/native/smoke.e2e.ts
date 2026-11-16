// Doctor for a simulator / emulator: the Debug build launches, loads its JavaScript from Metro, and the
// signed-out landmark renders.
import { describe } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { signedOutTest } from './support';

describe('smoke', () => {
  signedOutTest('opens on the sign-in screen', async ({ app, screen }) => {
    await app.open();

    // The first launch waits for Metro to bundle the app.
    await expect(screen.getByTestId('signInEmail')).toBeVisible({ timeout: 180_000 });
    await expect(screen.getByTestId('signInPassword')).toBeVisible();
    await expect(screen.getByTestId('signInSubmit')).toBeVisible();
  });
});
