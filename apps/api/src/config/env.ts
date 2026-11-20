import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function parseBool(v: string | undefined): boolean {
  return v === 'true' || v === '1';
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me-please-32-chars-min'),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  refreshExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cookieSecure: parseBool(process.env.COOKIE_SECURE),
  cookieSameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  trustProxy: parseBool(process.env.TRUST_PROXY),
  dataDir: process.env.DATA_DIR ?? './data',
  persistenceEnabled:
    process.env.PERSISTENCE_ENABLED === 'false'
      ? false
      : process.env.NODE_ENV !== 'test' && !process.env.VITEST,
};