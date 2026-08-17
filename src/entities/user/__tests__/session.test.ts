import { afterEach, describe, expect, it, vi } from "vitest";
import { signIn } from "../session";

/**
 * The shared password is the only lock on the Super Admin panel, so the ways
 * it can be wrong matter more than the way it can be right. All three cases
 * resolve before any cookie or hash is touched, which is why this needs no
 * request context.
 */
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
    delete: () => undefined,
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("super admin password", () => {
  it("refuses to open the panel in production without a password", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPERADMIN_PASSWORD", undefined);

    await expect(signIn("anything")).rejects.toThrow(/is not set/);
  });

  it("refuses the development default in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // The value that is published in the repository, and therefore no lock.
    vi.stubEnv("SUPERADMIN_PASSWORD", "reserve-dev");

    await expect(signIn("reserve-dev")).rejects.toThrow(/development default/);
  });

  it("still works locally with no configuration at all", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPERADMIN_PASSWORD", undefined);

    // Rejecting a wrong password proves the default was consulted rather
    // than thrown over; a correct one is the developer's daily path.
    await expect(signIn("wrong")).resolves.toBe(false);
  });
});
