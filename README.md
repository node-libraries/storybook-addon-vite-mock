# storybook-addon-vite-mock

[![npm](https://img.shields.io/npm/v/storybook-addon-vite-mock)](https://www.npmjs.com/package/storybook-addon-vite-mock)
[![license](https://img.shields.io/npm/l/storybook-addon-vite-mock)](https://www.npmjs.com/package/storybook-addon-vite-mock)
[![downloads](https://img.shields.io/npm/dw/storybook-addon-vite-mock)](https://www.npmjs.com/package/storybook-addon-vite-mock)

Provides module mocking functionality like `jest.mock` on Storybook@10 with Vite.

![](https://raw.githubusercontent.com/ReactLibraries/storybook-addon-module-mock/master/document/image/image01.png)  
![](https://raw.githubusercontent.com/ReactLibraries/storybook-addon-module-mock/master/document/image/image02.png)

## Features

- **Module Mocking for Vite**: Mock imported functions and modules in Storybook without external runners.
- **Dynamic Interaction**: Change mock values and trigger re-renders dynamically inside `play` functions.
- **Original Implementation Access**: Call original implementations with `getOriginal()`.
- **Addon Panel**: Inspect mock calls, arguments, and return values in the Storybook "Mocks" panel.
- **Accessibility Inspection**: Built-in "Node info" panel to inspect DOM roles and accessibility metadata.

---

## Installation & Setup

### 1. Install

```bash
npm i -D storybook-addon-vite-mock
# or
pnpm add -D storybook-addon-vite-mock
# or
yarn add -D storybook-addon-vite-mock
```

### 2. Add to `.storybook/main.ts`

Only works if Vite is used in the Builder.

```ts
import type { StorybookConfig } from '@storybook/react-vite';
// or import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    'storybook-addon-vite-mock', // Add addon here
  ],
  framework: {
    name: '@storybook/react-vite', // or '@storybook/nextjs-vite'
    options: {},
  },
};

export default config;
```

---

## Usage

### Basic Example

Mock an imported function (`getGreeting`) in story `parameters`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { createMock, getMock, render } from 'storybook-addon-vite-mock';
import { GreetingComponent } from './GreetingComponent';
import { getGreeting } from './api';

const meta: Meta<typeof GreetingComponent> = {
  component: GreetingComponent,
  parameters: {
    moduleMock: {
      mock: () => {
        const mockFn = createMock(getGreeting);
        mockFn.mockReturnValue('Hello, Mocked World!');
        return [mockFn];
      },
    },
  },
};
export default meta;

export const Default: StoryObj<typeof GreetingComponent> = {};

export const CustomGreeting: StoryObj<typeof GreetingComponent> = {
  play: async ({ parameters }) => {
    // Retrieve mock instance and alter its return value
    const mockFn = getMock(parameters, getGreeting);
    mockFn.mockReturnValue('Welcome to Storybook!');

    // Re-render the story component with the new mock value
    render(parameters);
  },
};
```

---

### Call Original Implementation

Use `getOriginal` to retain or inspect original function behavior:

```tsx
import { createMock, getOriginal } from 'storybook-addon-vite-mock';
import { calculateTotal } from './calculator';

export const FallbackToOriginal: StoryObj = {
  parameters: {
    moduleMock: {
      mock: () => {
        const mock = createMock(calculateTotal);
        mock.mockImplementation((...args) => {
          const originalValue = getOriginal(calculateTotal)(...args);
          return originalValue > 100 ? 100 : originalValue;
        });
        return [mock];
      },
    },
  },
};
```

---

### Re-render with Updated Args

Pass updated args to `render()` to test interactive prop updates:

```tsx
import { getMock, render } from 'storybook-addon-vite-mock';

export const Interactive: StoryObj = {
  play: async ({ parameters }) => {
    const mock = getMock(parameters, someFn);
    mock.mockReturnValue('Updated Value');

    // Trigger re-render with new args
    render(parameters, { status: 'success' });
  },
};
```

---

## Addon Options

Customize exclude rules or enable debug AST dumps in `.storybook/main.ts`:

```ts
addons: [
  {
    name: 'storybook-addon-vite-mock',
    options: {
      // Exclude files matching specific paths
      exclude: ({ id, code }: { id: string; code: string }) => {
        return id.includes('.stories.');
      },
      // Optional AST-based exclusion
      excludeFromAst: ({ id, code, ast }) => {
        return false;
      },
      // Optional debug directory to output transformed files
      // debugPath: 'tmp',
    },
  },
]
```

---

## API Reference

| Function / Type | Description |
| :--- | :--- |
| `createMock(fn)` | Creates a mock function for the target import and tracks its calls in the Storybook Mocks panel. |
| `getMock(parameters, fn)` | Retrieves the mock instance corresponding to `fn` from story `parameters`. |
| `getOriginal(fn)` | Retrieves the unmocked, original implementation of the function. |
| `render(parameters, args?)` | Forces a re-render of the story component, optionally with updated `args`. |
| `resetMock(parameters)` | Calls `mockReset()` on all mocks registered for the current story. |
| `clearMock(parameters)` | Calls `mockClear()` on all mocks registered for the current story. |
| `AddonOptions` | Type definition for plugin options (`exclude`, `excludeFromAst`, `debugPath`). |

---

## Samples & Demo

- **Sample Code**: [examples/storybook-vite](examples/storybook-vite)
- **Online Demo**: <https://node-libraries.github.io/storybook-addon-vite-mock/>

---

## Monorepo Development

```bash
# Install dependencies
pnpm install

# Build addon package
pnpm build

# Start addon watch build & Storybook dev server simultaneously
pnpm dev

# Run Storybook dev server
pnpm storybook

# Run Storybook test-runner against production build
pnpm test

# Run Storybook test-runner against Storybook dev server (auto start & teardown)
pnpm test:dev

# Run Storybook test-runner against an already running Storybook instance (port 9001)
pnpm test:running

# Run ESLint across packages
pnpm lint
```