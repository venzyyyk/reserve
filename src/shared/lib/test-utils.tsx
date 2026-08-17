import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import messages from "../../../messages/uk.json";

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale="uk"
      timeZone="Europe/Kyiv"
      messages={messages}
    >
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Render with the real uk catalogue. Tests assert on the strings users
 * actually see, and a missing translation key fails the test rather than
 * silently rendering a key path.
 */
export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  return render(ui, { wrapper: Wrapper, ...options });
}
