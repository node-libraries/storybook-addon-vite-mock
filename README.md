# storybook-addon-vite-mock

[![npm](https://img.shields.io/npm/v/storybook-addon-vite-mock)](https://www.npmjs.com/package/storybook-addon-vite-mock)
[![license](https://img.shields.io/npm/l/storybook-addon-vite-mock)](https://www.npmjs.com/package/storybook-addon-vite-mock)
[![downloads](https://img.shields.io/npm/dw/storybook-addon-vite-mock)](https://www.npmjs.com/package/storybook-addon-vite-mock)

Provides module mocking functionality like `jest.mock` on Storybook@10 with Vite.

## usage

Added 'storybook-addon-vite-mock' to Storybook addons.  
Only works if Vite is used in the Builder.

### Confirmed Frameworks

- @storybook/react-vite
- @storybook/nextjs-vite

### Sample code & Online Demo

- Sample code (examples)  
  https://github.com/node-libraries/storybook-addon-vite-mock/tree/master/examples/storybook-vite  
  ([examples/storybook-vite](examples/storybook-vite))

- Online Demo  
  https://node-libraries.github.io/storybook-addon-vite-mock/

## Monorepo Development

```bash
# Install all dependencies
pnpm install

# Build addon package
pnpm build

# Start addon watch build & Storybook dev server simultaneously
pnpm dev

# Run Storybook dev server
pnpm storybook

# Build Storybook static output
pnpm storybook:build

# Run Storybook test-runner
pnpm test

# Run ESLint across packages
pnpm lint
```

## Addon options

```ts
addons: [
  {
    name: 'storybook-addon-vite-mock',
    options: {
      exclude: ({ id }: { id: string[]; code: string }) => {
        return id.includes(".stories.");
      },
    },
  },
]
```