import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The first deploy of this project failed here, and not because anything was
 * misconfigured: Vercel offers every name it finds in `.env.example` as a row
 * to fill in and stores `""` for the ones left blank, so "no app URL chosen
 * yet" arrived as an empty string and the build stopped on a variable nobody
 * had touched. These pin down that an empty variable means an absent one,
 * without letting a *wrong* value through.
 *
 * `env.ts` validates at import, so each case needs a fresh module.
 */
const load = async () => {
  vi.resetModules();
  return import("../env");
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("empty variables", () => {
  it("falls back to the default when the app URL is blank", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const { clientEnv } = await load();
    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("treats whitespace as blank, so a stray newline is not a URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "  \n ");

    const { clientEnv } = await load();
    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("reports a blank database URI as no database, not a broken one", async () => {
    vi.stubEnv("MONGODB_URI", "");

    const { isMongoConfigured } = await load();
    expect(isMongoConfigured()).toBe(false);
  });

  it("defaults the database name when it is blank", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
    vi.stubEnv("MONGODB_DB_NAME", "");

    const { databaseEnv } = await load();
    expect(databaseEnv().MONGODB_DB_NAME).toBe("reserve");
  });
});

describe("wrong variables still fail", () => {
  it("rejects an app URL that is set but not a URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "reserve.com.ua");

    await expect(load()).rejects.toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects a connection string pasted into the public site URL", async () => {
    // The first deploy of this project published exactly this in every page's
    // canonical tag: adjacent boxes on a hosting dashboard, both wanting a
    // URL, and `url()` accepts any scheme.
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "mongodb+srv://user:secret@cluster0.example.mongodb.net/",
    );

    await expect(load()).rejects.toThrow(/http/);
  });

  it("rejects an http address that carries credentials", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://admin:hunter2@reserve.com.ua");

    await expect(load()).rejects.toThrow(/credentials/);
  });

  it("rejects a connection string that is not MongoDB's", async () => {
    vi.stubEnv("MONGODB_URI", "postgres://localhost:5432");

    const { databaseEnv } = await load();
    expect(() => databaseEnv()).toThrow(/mongodb/);
  });
});
