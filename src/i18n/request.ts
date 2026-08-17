import { getRequestConfig } from "next-intl/server";

/**
 * Single-locale launch (MPS §8): uk only, but every string flows through
 * next-intl from M0, so additional locales are additive, never a rewrite.
 * The timezone is fixed to Europe/Kyiv — club hours are wall-clock local.
 */
export default getRequestConfig(async () => ({
  locale: "uk",
  timeZone: "Europe/Kyiv",
  messages: (await import("../../messages/uk.json")).default,
}));
