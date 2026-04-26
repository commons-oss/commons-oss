import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearedSessionCookie,
  decodeSession,
  encodeSession,
  sessionCookie,
} from '../src/cookie.ts';
import { resetConfigForTests } from '../src/config.ts';
import type { Session } from '../src/types.ts';

const SECRET = 'test-secret-test-secret-test-secret-12345';

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
  process.env.AUTH_ORIGIN = 'http://localhost:3000';
  resetConfigForTests();
});

afterEach(() => {
  resetConfigForTests();
});

const sampleSession = (): Session => {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId: '11111111-1111-1111-1111-111111111111',
    logtoSub: 'stub|test',
    orgId: '22222222-2222-2222-2222-222222222222',
    orgSlug: 'fc-musterstadt',
    locale: 'de',
    iat: now,
    exp: now + 3600,
  };
};

describe('cookie', () => {
  it('round-trips a session', async () => {
    const s = sampleSession();
    const token = await encodeSession(s);
    const back = await decodeSession(token);
    expect(back).toMatchObject({
      userId: s.userId,
      logtoSub: s.logtoSub,
      orgId: s.orgId,
      orgSlug: s.orgSlug,
      locale: s.locale,
    });
  });

  it('rejects a tampered token', async () => {
    const s = sampleSession();
    const token = await encodeSession(s);
    const tampered = token.slice(0, -2) + 'XX';
    expect(await decodeSession(tampered)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const s = sampleSession();
    s.iat = Math.floor(Date.now() / 1000) - 7200;
    s.exp = s.iat + 60;
    const token = await encodeSession(s);
    expect(await decodeSession(token)).toBeNull();
  });

  it('builds a cookie with HttpOnly + SameSite=Lax', () => {
    const c = sessionCookie('abc', 60, false);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Max-Age=60');
    expect(c).not.toContain('Secure');
  });

  it('adds Secure when isProd', () => {
    expect(sessionCookie('abc', 60, true)).toContain('Secure');
  });

  it('cleared cookie is Max-Age=0', () => {
    expect(clearedSessionCookie(false)).toContain('Max-Age=0');
  });
});
