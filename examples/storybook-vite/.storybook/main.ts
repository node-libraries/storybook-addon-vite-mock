import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
    {
      name: "@storybook/addon-coverage",
      options: {
        istanbul: {
          exclude: ["virtual:___mock.js"],
        },
      },
    },
    {
      name: "storybook-addon-vite-mock",
      options: {
        exclude: ({ id }: { id: string[]; code: string }) => {
          return id.includes(".stories.");
        },
        // debugPath: "tmp",
      },
    },
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
};
export default config;
