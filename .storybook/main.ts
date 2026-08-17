import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs", options: {} },
  // No `staticDirs`. There is no `public/` directory and there is nothing to
  // put in one: every graphic in the design system is an inline SVG or a CSS
  // gradient, and the app icon is an App Router file convention. Pointing
  // Storybook at a directory that does not exist is a hard build error, and
  // committing an empty folder with a placeholder file to satisfy this line
  // would be the wrong way round — the config should describe the project.
  typescript: { reactDocgen: "react-docgen-typescript" },
};

export default config;
