import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";
import { createMock, getMock, render } from "storybook-addon-vite-mock";
import { getMessage } from "./message";
import { ReRender } from "./ReRender";

const meta: Meta<typeof ReRender> = {
  component: ReRender,
};
export default meta;

export const Primary: StoryObj<typeof ReRender> = {};

export const ReRenderTest: StoryObj<typeof ReRender> = {
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
    mock.mockReturnValue("Test1");
    render(parameters);
    await waitFor(() => {
      expect(canvas.getByText("Test1")).toBeInTheDocument();
    });
    mock.mockReturnValue("Test2");
    render(parameters);
    await waitFor(() => {
      expect(canvas.getByText("Test2")).toBeInTheDocument();
    });
  },
};
