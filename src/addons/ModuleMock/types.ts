import type { Mock } from 'jest-mock';

export const ADDON_ID = 'storybook-addon-module-mock';
export const TAB_ID = `${ADDON_ID}/tab`;

export type ModuleType<T> = {
  __module: T;
  __event?: () => void;
  __name: string;
  __original: unknown;
};
export type Mocks = (Mock<unknown, unknown[]> & ModuleType<unknown>)[];
export type ModuleMock<T extends (...args: unknown[]) => unknown> = Mock<
  ReturnType<T>,
  Parameters<T>
> &
  ModuleType<T>;
export type moduleMockParameter = {
  moduleMock: {
    mock?: () => Mocks;
    mocks?: Mocks;
    render: (args?: { [key: string]: unknown }) => void;
  };
};

export type moduleMock = Pick<moduleMockParameter['moduleMock'], 'mock'>;
