// e2e tests on an iOS simulator / Android emulator: `npx e2e run --config e2e.native.config.ts --target ios`.
// Needs a Debug build of the app installed on a booted device (Mobile e2e jobs in .github/workflows/ci.yml show
// the steps); the runner starts the API and Metro (e2e/serve-native.mjs). Web tests: e2e.config.ts.
import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { apiInheritEnv, reader, readerEnv } from './e2e/reader';

const bundleId = process.env.APP_BUNDLE_ID || 'com.example.bookshelf';

// One process for both targets: the API on :3000 (what a Debug build calls) and Metro on :8081.
const command = {
  executable: 'node',
  args: ['e2e/serve-native.mjs', '8081'],
  env: readerEnv,
  inheritEnv: [...apiInheritEnv, 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'APP_BUNDLE_ID'],
  startupTimeout: 180_000,
  log: '.e2e/logs/native-app.log',
};

export default {
  tests: 'e2e/tests/native/**/*.e2e.ts',
  workers: 1,
  targets: [
    {
      name: 'ios',
      engine: mobile({ platform: 'ios' }),
      app: {
        bundleId,
        // Russian UI, like the web target; no notification prompt over the shelf after sign-in.
        launchArguments: ['-AppleLanguages', '(ru)', '-AppleLocale', 'ru_RU'],
        permissions: { notifications: 'grant' },
        command,
        readyUrl: 'http://127.0.0.1:8081/status',
      },
    },
    {
      name: 'android',
      engine: mobile({ platform: 'android' }),
      app: { bundleId, permissions: { notifications: 'grant' }, command, readyUrl: 'http://127.0.0.1:8081/status' },
    },
  ],
  credentials: { reader },
} satisfies E2EConfig;
