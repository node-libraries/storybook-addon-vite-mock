# storybook-addon-vite-mock-test

Sample application and test suite for [storybook-addon-vite-mock](https://www.npmjs.com/package/storybook-addon-vite-mock).

## Demo

- Storybook Demo: <https://node-libraries.github.io/storybook-addon-vite-mock/>

---

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Storybook in Development Mode

```bash
pnpm storybook
```

Storybook will start at `http://localhost:9001`.

### 3. Build Storybook

```bash
pnpm storybook:build
```

### 4. Run Tests

```bash
pnpm test
```

Runs the test runner against the built Storybook with coverage report.

---

## Usage Guide

`storybook-addon-vite-mock` enables mocking of ESM / CommonJS imports directly within Vite Storybook stories.

### Basic Workflow

1. Import mock utilities from `storybook-addon-vite-mock`.
2. Define `moduleMock` in story `parameters`.
3. Use `createMock(targetFunction)` to mock imported modules or functions.
4. (Optional) Interact with mocks and trigger re-renders in the `play` function.

---

### Example 1: Basic Module Mocking

Mock an imported function (`Test`) using `createMock` and verify it in the `play` function.

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { createMock, getMock, render } from 'storybook-addon-vite-mock';
import { Button } from './Button';
import { Test } from './test';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    moduleMock: {
      mock: () => {
        const mockTest = createMock(Test);
        mockTest.mockReturnValue('Mocked Value');
        return [mockTest];
      },
    },
  },
};
export default meta;

export const Primary: StoryObj<typeof Button> = {
  play: async ({ parameters }) => {
    // Retrieve the mock instance
    const mockTest = getMock(parameters, Test);

    // Dynamically change mock return value & re-render
    mockTest.mockReturnValue('Updated Value');
    render(parameters);
  },
};
```

---

### Example 2: Call Original Implementation

Use `getOriginal` to retain or inspect the original behavior:

```tsx
import { createMock, getOriginal } from 'storybook-addon-vite-mock';
import { useMemo } from 'react';

export const MockWithOriginal: StoryObj = {
  parameters: {
    moduleMock: {
      mock: () => {
        const mock = createMock(useMemo);
        mock.mockImplementation((fn, deps) => {
          // Call original function
          const originalResult = getOriginal(useMemo)(fn, deps);
          return originalResult === 'Before' ? 'After' : originalResult;
        });
        return [mock];
      },
    },
  },
};
```

---

### Example 3: Re-render with New Args

Re-render the component with new story args during interaction tests:

```tsx
import { getMock, render } from 'storybook-addon-vite-mock';

export const ReRenderExample: StoryObj = {
  play: async ({ parameters }) => {
    const mock = getMock(parameters, someFunction);
    mock.mockReturnValue('New Result');

    // Re-render with updated args
    render(parameters, { label: 'Clicked!' });
  },
};
```

---

## API Reference

| Function | Description |
| :--- | :--- |
| `createMock(fn)` | Creates a mock function for the target import and tracks its state in Storybook. |
| `getMock(parameters, fn)` | Retrieves the mock instance corresponding to `fn` from the story `parameters`. |
| `getOriginal(fn)` | Retrieves the original, un-mocked function implementation. |
| `render(parameters, args?)` | Forces a re-render of the current story, optionally passing updated `args`. |
| `resetMock(parameters)` | Calls `mockReset()` on all mocks registered for the current story. |
| `clearMock(parameters)` | Calls `mockClear()` on all mocks registered for the current story. |

---

## Mocks Addon Panel

When Storybook is running, open the **Mocks** tab in the addons panel to inspect:
- Active mock instances
- Call counts and execution history
- Arguments passed to each call
- Return values and execution results
