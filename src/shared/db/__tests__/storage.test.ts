import { afterEach, describe, expect, it } from "vitest";
import { selectAdapter, storageMode } from "../storage";

/**
 * Storage selection is a safety property, not a convenience: the failure it
 * prevents is a production server that looks healthy, takes payments, and
 * loses every booking on the next deploy. These tests run without a
 * database, because what they check is the decision, not the connection.
 */
const original = {
  uri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
};

/**
 * `NODE_ENV` is typed read-only, which is right everywhere except here:
 * the whole point of these tests is to stand in each environment and see
 * what the code decides.
 */
const env = process.env as Record<string, string | undefined>;

const setEnv = (key: "MONGODB_URI" | "NODE_ENV", value?: string): void => {
  if (value === undefined) {
    delete env[key];
  } else {
    env[key] = value;
  }
};

afterEach(() => {
  setEnv("MONGODB_URI", original.uri);
  setEnv("NODE_ENV", original.nodeEnv);
});

describe("storageMode", () => {
  it("uses MongoDB whenever a URI is configured", () => {
    setEnv("MONGODB_URI", "mongodb://localhost:27017");
    setEnv("NODE_ENV", "development");
    expect(storageMode()).toBe("mongodb");

    setEnv("NODE_ENV", "production");
    expect(storageMode()).toBe("mongodb");
  });

  it("allows in-memory storage in development", () => {
    setEnv("MONGODB_URI", undefined);
    setEnv("NODE_ENV", "development");
    expect(storageMode()).toBe("memory");
  });

  it("refuses to run in production without a database", () => {
    setEnv("MONGODB_URI", undefined);
    setEnv("NODE_ENV", "production");
    expect(() => storageMode()).toThrow(/MONGODB_URI is not set/);
  });

  it("never mentions the connection string when it complains", () => {
    setEnv("MONGODB_URI", undefined);
    setEnv("NODE_ENV", "production");
    try {
      storageMode();
      expect.unreachable("should have refused");
    } catch (error) {
      expect(String(error)).not.toContain("mongodb://");
      expect(String(error)).not.toContain("mongodb+srv://");
    }
  });
});

describe("selectAdapter", () => {
  const adapters = {
    mongodb: () => ({ name: () => "mongodb" }),
    memory: () => ({ name: () => "memory" }),
  };

  it("resolves on use, not on import", () => {
    setEnv("MONGODB_URI", undefined);
    setEnv("NODE_ENV", "development");

    // Built while there is no database configured...
    const repository = selectAdapter(adapters);

    // ...and still picks MongoDB once one is.
    setEnv("MONGODB_URI", "mongodb://localhost:27017");
    expect(repository.name()).toBe("mongodb");
  });

  it("does not fall back when MongoDB is configured", () => {
    setEnv("MONGODB_URI", "mongodb://localhost:27017");
    const repository = selectAdapter(adapters);
    expect(repository.name()).toBe("mongodb");
    expect(repository.name()).toBe("mongodb");
  });

  it("propagates the production refusal instead of quietly using memory", () => {
    setEnv("MONGODB_URI", undefined);
    setEnv("NODE_ENV", "production");
    const repository = selectAdapter(adapters);
    expect(() => repository.name()).toThrow(/refuses to run in production/);
  });
});
