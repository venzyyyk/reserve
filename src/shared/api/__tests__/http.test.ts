import { AppError } from "../errors";
import { http } from "../http";

function mockFetchOnce(responses: Array<() => Response | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const next = responses[Math.min(i, responses.length - 1)];
      i += 1;
      if (!next) throw new Error("no mock response");
      const result = next();
      if (result instanceof Error) throw result;
      return result;
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("http", () => {
  it("returns parsed JSON on success", async () => {
    mockFetchOnce([() => Response.json({ ok: true })]);
    await expect(http<{ ok: boolean }>("/api/clubs")).resolves.toEqual({
      ok: true,
    });
  });

  it("normalizes HTTP status to AppError codes", async () => {
    mockFetchOnce([() => new Response(null, { status: 409 })]);
    const error = await http("/api/holds", { method: "PUT" }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("conflict");
    expect((error as AppError).retryable).toBe(false);
  });

  it("retries retryable GET failures, then succeeds", async () => {
    const calls = mockFetchOnce([
      () => new Response(null, { status: 500 }),
      () => Response.json({ ok: true }),
    ]);
    await expect(http("/api/clubs")).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("never retries mutations", async () => {
    const calls = mockFetchOnce([() => new Response(null, { status: 500 })]);
    await expect(
      http("/api/bookings", { method: "POST", body: {} }),
    ).rejects.toBeInstanceOf(AppError);
    expect(calls).toHaveLength(1);
  });

  it("attaches idempotency keys to hold creation", async () => {
    const calls = mockFetchOnce([() => Response.json({})]);
    await http("/api/holds", { method: "POST", body: {} });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(/[0-9a-f-]{36}/);
  });
});
