// The account the e2e tests sign in as (credentials.reader in both configs). serve-web.mjs / serve-native.mjs
// register it on the first run against a database. A local test account for the dev database; on a shared
// database or in CI override it with E2E_USER_READER_USERNAME / E2E_USER_READER_PASSWORD.
export const reader = {
  username: process.env.E2E_USER_READER_USERNAME ?? 'e2e-reader@example.test',
  password: process.env.E2E_USER_READER_PASSWORD ?? 'polka-e2e-reader',
};

/** Hands the account to the server script, which makes sure it exists. */
export const readerEnv = { E2E_READER_EMAIL: reader.username, E2E_READER_PASSWORD: reader.password };

/** Server settings for the API the scripts start (locally Next.js also reads the root .env). */
export const apiInheritEnv = ['DATABASE_URL', 'REDIS_URL', 'AUTH_SECRET', 'AUTH_TRUST_HOST', 'APP_URL', 'E2E_API_URL'];
