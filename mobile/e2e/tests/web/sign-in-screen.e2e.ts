// agent.assert judges the screen with the agent on every run (it is never replayed from the cache), so this
// test needs a Claude login: `claude` signed in locally, CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY in CI.
// Without one in CI it is skipped.
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const agentLogin = !process.env.CI || Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY);

describe('sign-in screen', () => {
  test(
    'offers email sign-in and registration',
    agentLogin ? {} : { skip: 'agent.assert needs a Claude login (CLAUDE_CODE_OAUTH_TOKEN)' },
    async ({ app, agent, screen }) => {
      await app.open();
      await screen.getByTestId('signInEmail').waitFor();

      await agent.assert('the screen offers signing in by email and password, and a way to switch to creating a new account');
      await expect(screen.getByTestId('signInSubmit')).toBeVisible();
    },
  );
});
