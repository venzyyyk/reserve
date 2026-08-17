"use client";

import { useActionState } from "react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * Deliberately plain: one field, one button, no branding theatre. This is
 * an internal door, and the only thing it owes anyone is a clear error.
 */
export function LoginForm({
  action,
}: {
  action: (
    state: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="w-full max-w-sm p-6">
      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-title text-fg">Панель платформи</h1>
          <p className="text-label text-fg-2">
            Доступ лише для команди Reserve
          </p>
        </div>

        <Input
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...(state.error && { error: state.error })}
        />

        <Button type="submit" variant="primary" size="lg" loading={pending}>
          Увійти
        </Button>
      </form>
    </Card>
  );
}
