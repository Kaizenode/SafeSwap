import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  verifySessionToken,
  getSession,
  requireSession,
  AuthError,
} from './session.ts';
import { GET as getMe } from '../../app/api/auth/me/route.ts';

const MOCK_ADDRESS = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSFSR4724';

test('createSessionToken and verifySessionToken - valid token', () => {
  const token = createSessionToken({ address: MOCK_ADDRESS });
  const payload = verifySessionToken(token);

  assert.notEqual(payload, null);
  assert.equal(payload?.address, MOCK_ADDRESS);
});

test('verifySessionToken - invalid signature', () => {
  const token = createSessionToken({ address: MOCK_ADDRESS });
  const tamperedToken = token.slice(0, -5) + 'xxxxx';
  const payload = verifySessionToken(tamperedToken);

  assert.equal(payload, null);
});

test('verifySessionToken - expired token', () => {
  const expiredToken = createSessionToken({ address: MOCK_ADDRESS }, -10);
  const payload = verifySessionToken(expiredToken);

  assert.equal(payload, null);
});

test('getSession - from Header cookie string', async () => {
  const token = createSessionToken({ address: MOCK_ADDRESS });
  const req = new Request('http://localhost/api/test', {
    headers: {
      cookie: `other=123; safeswap.session=${token}; foo=bar`,
    },
  });

  const session = await getSession(req);
  assert.notEqual(session, null);
  assert.equal(session?.address, MOCK_ADDRESS);
});

test('getSession - unauthenticated request', async () => {
  const req = new Request('http://localhost/api/test');
  const session = await getSession(req);

  assert.equal(session, null);
});

test('requireSession - valid session', async () => {
  const token = createSessionToken({ address: MOCK_ADDRESS });
  const req = new Request('http://localhost/api/test', {
    headers: {
      cookie: `safeswap.session=${token}`,
    },
  });

  const session = await requireSession(req);
  assert.equal(session.address, MOCK_ADDRESS);
});

test('requireSession - throws 401 AuthError when unauthenticated', async () => {
  const req = new Request('http://localhost/api/test');

  await assert.rejects(
    async () => {
      await requireSession(req);
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthError);
      assert.equal((err as AuthError).status, 401);
      assert.equal((err as AuthError).message, 'Unauthorized');
      return true;
    }
  );
});

test('GET /api/auth/me - 401 when unauthenticated', async () => {
  const req = new Request('http://localhost/api/auth/me');
  const res = await getMe(req as any);

  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'Unauthorized');
});

test('GET /api/auth/me - 200 with address when authenticated', async () => {
  const token = createSessionToken({ address: MOCK_ADDRESS });
  const req = new Request('http://localhost/api/auth/me', {
    headers: {
      cookie: `safeswap.session=${token}`,
    },
  });
  const res = await getMe(req as any);

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.address, MOCK_ADDRESS);
});
