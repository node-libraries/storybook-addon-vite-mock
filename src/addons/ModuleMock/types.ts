import type { Mock } from '@storybook/test';

export const ADDON_ID = 'storybook-addon-module-mock';
export const TAB_ID = `${ADDON_ID}/tab`;

export type ModuleType<T> = {
  __module: T;
  __event?: () => void;
  __name: string;
};
export type Mocks = (Mock & ModuleType<unknown>)[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModuleMock<T extends (...args: any[]) => any> = Mock<Parameters<T>, ReturnType<T>> &
  ModuleType<T>;
export type moduleMockParameter = {
  moduleMock: {
    mock?: () => Mocks;
    mocks?: Mocks;
    render: (args?: { [key: string]: unknown }) => void;
  };
};

export type moduleMock = Pick<moduleMockParameter['moduleMock'], 'mock'>;
