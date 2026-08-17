import { AppError } from "./errors";

/**
 * Transport layer (MPS §8). Feature api/ modules wrap this — pages never
 * call fetch directly. Idempotency keys are auto-attached to mutation paths
 * that create money-adjacent resources (holds, payments).
 */
export interface HttpOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Overrides the default 10s timeout. */
  timeoutMs?: number;
  /** GET-only automatic retries (network/5xx), default 2. */
  retries?: number;
}

const IDEMPOTENT_PATHS = [/\/holds$/, /\/payments$/];
const DEFAULT_TIMEOUT_MS = 10_000;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new AppError("unknown", { cause: signal.reason }));
    });
  });
}

export async function http<T>(
  path: string,
  options: HttpOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    signal,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const maxRetries = method === "GET" ? (options.retries ?? 2) : 0;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (method === "POST" && IDEMPOTENT_PATHS.some((re) => re.test(path))) {
    finalHeaders["Idempotency-Key"] ??= crypto.randomUUID();
  }

  let attempt = 0;
  for (;;) {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    try {
      const response = await fetch(path, {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "include",
        signal: signal ?? timeoutController.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const error = AppError.fromStatus(response.status);
        if (error.retryable && attempt < maxRetries) {
          attempt += 1;
          await delay(2 ** attempt * 250 + Math.random() * 250, signal);
          continue;
        }
        throw error;
      }
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (cause) {
      clearTimeout(timer);
      if (cause instanceof AppError) throw cause;
      const isTimeout = timeoutController.signal.aborted;
      const error = new AppError(isTimeout ? "timeout" : "network", { cause });
      if (error.retryable && attempt < maxRetries) {
        attempt += 1;
        await delay(2 ** attempt * 250 + Math.random() * 250, signal);
        continue;
      }
      throw error;
    }
  }
}
