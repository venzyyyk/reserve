import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/shared/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private surfaces and filtered permutations stay out of the index.
        disallow: ["/me", "/admin", "/booking/", "/clubs?"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
