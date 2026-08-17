"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "@/shared/api/query";
import { AppToaster } from "@/shared/ui/toast";
import { TooltipProvider } from "@/shared/ui/tooltip";

/**
 * Providers for authenticated / transactional surfaces — the booking flow,
 * player area and admin (M2+). Mounted by those segments' layouts, never at
 * the root: public pages have no server state, tooltips or toasts, and must
 * not carry their runtime (ADR-0006).
 */
export function ProductProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <AppToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
