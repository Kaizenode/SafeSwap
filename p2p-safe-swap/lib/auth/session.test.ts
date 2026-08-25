import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  AuthError,
  SESSION_COOKIE_NAME,
  getSession,
  requireSession,
} from "./session";

const TEST_SECRET = "test-session-secret-at-least-32-bytes-long";

async function signToken(
  claims: Record<string, unknown>,
  opts: { expiresIn?: string } = {}
) {
  const key = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? "30d")
    .sign(key);
}

function requestWithCookie(cookie?: string) {
  return new Request("https://example.test/api/auth/me", {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("session", () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
  });

  describe("getSession", () => {
    it("returns null when there is no cookie", async () => {
      const session = await getSession(requestWithCookie());
      expect(session).toBeNull();
    });

    it("returns null for an unrelated cookie", async () => {
      const session = await getSession(requestWithCookie("other=abc"));
      expect(session).toBeNull();
    });

    it("resolves the address from a valid token (address claim)", async () => {
      const token = await signToken({
        address: "GABC1234567890ADDRESSEXAMPLE",
      });
      const session = await getSession(
        requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)
      );
      expect(session).toEqual({ address: "GABC1234567890ADDRESSEXAMPLE" });
    });

    it("falls back to the sub claim if address is absent", async () => {
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("GSUBFALLBACKADDRESS")
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(new TextEncoder().encode(TEST_SECRET));

      const session = await getSession(
        requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)
      );
      expect(session).toEqual({ address: "GSUBFALLBACKADDRESS" });
    });

    it("returns null for an expired token", async () => {
      const token = await signToken(
        { address: "GEXPIRED" },
        { expiresIn: "-1s" }
      );
      const session = await getSession(
        requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)
      );
      expect(session).toBeNull();
    });

    it("returns null for a token signed with the wrong secret", async () => {
      const badKey = new TextEncoder().encode("a-completely-different-secret!!");
      const token = await new SignJWT({ address: "GBAD" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(badKey);

      const session = await getSession(
        requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)
      );
      expect(session).toBeNull();
    });

    it("returns null for a malformed token", async () => {
      const session = await getSession(
        requestWithCookie(`${SESSION_COOKIE_NAME}=not-a-real-jwt`)
      );
      expect(session).toBeNull();
    });
  });

  describe("requireSession", () => {
    it("returns the session for a valid cookie", async () => {
      const token = await signToken({ address: "GVALIDADDRESS" });
      const session = await requireSession(
        requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`)
      );
      expect(session).toEqual({ address: "GVALIDADDRESS" });
    });

    it("throws a 401 AuthError when there is no session", async () => {
      await expect(requireSession(requestWithCookie())).rejects.toMatchObject({
        name: "AuthError",
        status: 401,
      });
    });

    it("throws an instance of AuthError specifically", async () => {
      await expect(requireSession(requestWithCookie())).rejects.toBeInstanceOf(
        AuthError
      );
    });
  });
});
