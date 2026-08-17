"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

/**
 * App toaster, mounted once in providers. Errors stay inline per MPS §3
 * ("error: never toast-only") — toasts carry confirmations and undo actions.
 */
export function AppToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-3 !text-fg !border-none !shadow-elev-2 !rounded-md",
          description: "!text-fg-2",
          actionButton: "!bg-gold !text-bg !rounded-full",
        },
      }}
    />
  );
}

export { toast };
