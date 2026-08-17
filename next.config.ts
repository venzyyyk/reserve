import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * The MongoDB driver loads optional native extras (compression, KMS) at
   * runtime. Bundling it makes the tracer chase modules that are not
   * installed; leaving it external lets Node require it normally.
   */
  serverExternalPackages: ["mongodb"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  /**
   * `/admin` is what a person types. The panel lives at `/superadmin`
   * because the name distinguishes it from a club's own dashboard, but a
   * 404 is a poor way to explain that distinction to whoever is trying to
   * get to work.
   */
  redirects: async () => [
    { source: "/admin", destination: "/superadmin", permanent: false },
    {
      source: "/admin/:path*",
      destination: "/superadmin/:path*",
      permanent: false,
    },
  ],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    },
  ],
};

export default withNextIntl(config);
