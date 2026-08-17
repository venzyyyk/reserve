import "@fontsource-variable/inter";
import "@fontsource-variable/unbounded";
import "@/shared/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CLIENT_NAMESPACES } from "@/shared/lib/i18n-namespaces";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: "%s — Reserve" },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Root layout ships only i18n (MPS §8 provider scoping, ADR-0006): Query,
 * tooltips, toasts and URL-state adapters are mounted by the segments that
 * use them, so marketing pages never pay for product runtime.
 *
 * The same reasoning applies to strings: by default next-intl serialises
 * the whole dictionary into the RSC payload of every page, so a visitor
 * reading the homepage downloads the Super Admin panel's labels. We pass
 * only the namespaces client components actually read
 * (`CLIENT_NAMESPACES`, guarded by a test); server components read the
 * full dictionary directly and cost nothing on the wire.
 */
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [
      ns,
      messages[ns],
    ]),
  );

  return (
    <html lang="uk" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={clientMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
