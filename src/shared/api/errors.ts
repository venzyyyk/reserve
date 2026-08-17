/**
 * Normalized application error (MPS §8). Every transport failure becomes an
 * AppError with a stable code, retryability, and a user-facing uk message.
 */
export type AppErrorCode =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "validation"
  | "server"
  | "unknown";

const UA_MESSAGES: Record<AppErrorCode, string> = {
  network: "Немає з'єднання. Перевірте інтернет і спробуйте ще раз.",
  timeout: "Сервер довго не відповідає. Спробуйте ще раз.",
  unauthorized: "Потрібно увійти, щоб продовжити.",
  forbidden: "У вас немає доступу до цієї дії.",
  not_found: "Не знайдено. Можливо, дані застаріли.",
  conflict: "Дані змінилися. Оновіть сторінку та спробуйте ще раз.",
  rate_limited: "Забагато спроб. Зачекайте хвилину.",
  validation: "Перевірте введені дані.",
  server: "Щось пішло не так на сервері. Ми вже розбираємось.",
  unknown: "Сталася невідома помилка. Спробуйте ще раз.",
};

const CODE_BY_STATUS: Record<number, AppErrorCode> = {
  400: "validation",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "rate_limited",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number | undefined;
  readonly retryable: boolean;
  readonly uaMessage: string;

  constructor(
    code: AppErrorCode,
    options?: { status?: number; cause?: unknown },
  ) {
    super(`AppError: ${code}${options?.status ? ` (${options.status})` : ""}`, {
      cause: options?.cause,
    });
    this.name = "AppError";
    this.code = code;
    this.status = options?.status;
    this.retryable =
      code === "network" || code === "timeout" || code === "server";
    this.uaMessage = UA_MESSAGES[code];
  }

  static fromStatus(status: number, cause?: unknown): AppError {
    const code =
      CODE_BY_STATUS[status] ?? (status >= 500 ? "server" : "unknown");
    return new AppError(code, { status, cause });
  }
}
