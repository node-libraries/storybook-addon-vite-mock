import { StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import {
  createMock,
  getMock,
  getOriginal,
  render,
} from "storybook-addon-vite-mock";
import { Button } from "./Button";
import { Test } from "./test";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
    moduleMock: {
      mock: () => {
        const mock = createMock(Test);
        mock.mockReturnValue("Primary");
        // Set original function
        mock.mockImplementation(getOriginal(Test));
        return [mock];
      },
    },
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    backgroundColor: { control: "color" },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    onClick: () => {
      fn();
    },
  },
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: StoryObj = {
  args: {
    primary: true,
    label: "Button",
  },
  play: async ({ parameters }) => {
    const mock = getMock(parameters, Test);
    mock.mockReturnValue("Primary");
    render(parameters);
  },
};

export const Secondary = {
  args: {
    label: "Button",
  },
  play: async ({ parameters }) => {
    const mock = getMock(parameters, Test);
    mock.mockReturnValue("Secondary");
    render(parameters);
  },
};

export const Large = {
  args: {
    size: "large",
    label: "Button",
  },
  play: async ({ parameters }) => {
    const mock = getMock(parameters, Test);
    mock.mockReturnValue("Large");
    render(parameters);
  },
};

export const Small = {
  args: {
    size: "small",
    label: "Button",
  },
  play: async ({ parameters }) => {
    const mock = getMock(parameters, Test);
    mock.mockReturnValue("Small");
    render(parameters);
  },
};
