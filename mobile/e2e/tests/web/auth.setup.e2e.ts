// Signs in once per run and saves the browser state (the token is in localStorage on web) as the
// `reader` session for the signed-in web tests.
import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test.setup('sign in as the reader', { sessions: ['reader'] }, async ({ app, screen, session }) => {
  const reader = credentials.user('reader');
  await app.open();
  await screen.getByTestId('signInEmail').fill(reader.username);
  await screen.getByTestId('signInPassword').fill(reader.password);
  await screen.getByTestId('signInSubmit').tap();
  await expect(screen.getByTestId('shelf')).toBeVisible({ timeout: 15_000 }); // signed in before saving
  await session.save('reader');
});
