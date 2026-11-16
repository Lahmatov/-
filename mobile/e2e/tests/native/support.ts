// Device tests start signed out: the app keeps its token in the keychain (SecureStore), which
// app.clearState() leaves behind on iOS, so the simulator's keychain is reset too.
import { test } from '@e2e-dev/mobile';

// Fixtures of a test.extend set up for every test registered through it, so tests need not destructure it.
export const signedOutTest = test.extend<{ signedOut: void }>({
  signedOut: async ({ app, device, platform }, use) => {
    if (platform === 'ios') await device.clearKeychain();
    await app.clearState();
    await use();
  },
});
