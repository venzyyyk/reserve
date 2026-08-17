import type { Preview } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";
import "@fontsource-variable/inter";
import "@fontsource-variable/unbounded";
import "../src/shared/styles/globals.css";
import messages from "../messages/uk.json";

/**
 * Storybook is the living documentation of the Cue design system: it renders
 * against the real token stylesheet and the real uk message catalogue, so a
 * token rename or a missing translation key surfaces here first.
 *
 * The product is dark-only by design (MPS §3) — dark *is* the baseline; the
 * surface swatches exist to check components on the elevations they ship on.
 */
const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      options: {
        bg: { name: "bg", value: "#0B0B0B" },
        surface1: { name: "surface-1", value: "#171717" },
        surface2: { name: "surface-2", value: "#242424" },
      },
    },
    a11y: { test: "error" },
  },
  initialGlobals: {
    backgrounds: { value: "bg" },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="uk"
        messages={messages}
        timeZone="Europe/Kyiv"
      >
        <div className="text-fg font-sans">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
