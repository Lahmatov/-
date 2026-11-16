// e2e tests of the app on the web engine (react-native-web in Chromium): `npm run test:e2e`.
// iOS / Android targets: e2e.native.config.ts. How to run and verify: .agents/skills/verify-polka/SKILL.md.
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { claudeCode } from '@e2e-dev/acp';
import { apiInheritEnv, reader, readerEnv } from './e2e/reader';

export default {
  tests: 'e2e/tests/web/**/*.e2e.ts',
  targets: [
    {
      name: 'web',
      // A phone-sized viewport and the Russian locale: the app's source strings are Russian (L()).
      engine: web({ viewport: { width: 390, height: 844 }, locale: 'ru-RU', timezoneId: 'Europe/Moscow' }),
      app: {
        url: 'http://127.0.0.1:8091',
        readyUrl: 'http://127.0.0.1:8091/api/v1/genres',
        command: {
          // Builds the web bundle, starts the API if it is not running, serves both on one origin.
          executable: 'node',
          args: ['e2e/serve-web.mjs', '{port}'],
          env: readerEnv,
          inheritEnv: [...apiInheritEnv, 'E2E_SKIP_EXPORT'],
          startupTimeout: 240_000,
          log: '.e2e/logs/app.log',
        },
      },
    },
  ],
  // agent.* steps run on Claude Code with its own login (`claude` signed in, or CLAUDE_CODE_OAUTH_TOKEN /
  // ANTHROPIC_API_KEY). agent.act steps replay from the committed .e2e/cache without the agent.
  agents: {
    default: {
      executor: claudeCode({
        model: 'sonnet',
        system:
          'You test «Полка», a Russian-language reading tracker (react-native-web build of a phone app). ' +
          'Tabs: «Полка» (shelf), «Поиск» (search), «Лента», «Итоги», «Профиль». Verify every outcome on screen.',
      }),
    },
  },
  credentials: { reader },
} satisfies E2EConfig;
