/**
 * Namespaces that reach the browser.
 *
 * next-intl ships whatever the client provider is given, so this list is
 * the difference between a visitor downloading the strings on their screen
 * and downloading every string in the product. Server components are not
 * affected — they read the dictionary on the server.
 *
 * Adding a `useTranslations("x")` call inside a `"use client"` file means
 * adding `"x"` here. The test beside this file fails if you forget.
 */
export const CLIENT_NAMESPACES = [
  "apply",
  "club",
  "errors",
  "filters",
  "flow",
  "search",
  "status",
  "tabs",
] as const;
