import { QueryClient } from "@tanstack/react-query";
import { AppError } from "./errors";

/**
 * Query defaults (MPS §8): server state lives in TanStack Query. Retries are
 * delegated to the transport layer (http.ts) — Query itself retries only
 * transport-retryable errors once more, and never mutations.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          error instanceof AppError && error.retryable && failureCount < 1,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
