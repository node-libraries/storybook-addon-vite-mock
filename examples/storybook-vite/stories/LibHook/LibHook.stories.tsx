import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { createMock, getMock } from "storybook-addon-vite-mock";
import { LibHook } from "./LibHook";
import { getMessage } from "./message";

const meta: Meta<typeof LibHook> = {
  component: LibHook,
};
export default meta;

export const Primary: StoryObj<typeof LibHook> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Before")).toBeInTheDocument();
  },
};

export const Mock: StoryObj<typeof LibHook> = {
  parameters: {
    moduleMock: {
      mock: () => {
        const mock = createMock(getMessage);
        mock.mockReturnValue("After");
        return [mock];
      },
    },
  },
  play: async ({ canvasElement, parameters }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("After")).toBeInTheDocument();
    const mock = getMock(parameters, getMessage);
    expect(mock).toBeCalled();
  },
};

export const Action: StoryObj<typeof LibHook> = {
  parameters: {
    moduleMock: {
      mock: () => {
        const mock = createMock(getMessage);
        return [mock];
      },
    },
  },
  play: async ({ canvasElement, parameters }) => {
    const canvas = within(canvasElement);
    const mock = getMock(parameters, getMessage);
    mock.mockReturnValue("Action");
    userEvent.click(await canvas.findByRole("button"));
    await waitFor(() => {
      expect(canvas.getByText("Action")).toBeInTheDocument();
    });
  },
};
