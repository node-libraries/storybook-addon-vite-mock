/* eslint-disable @typescript-eslint/no-explicit-any */

import { Mock, fn, mocks } from 'storybook/test';
import { ModuleMock, moduleMockParameter } from '../addons/ModuleMock/types.js';
import { AnyFunction } from '../vite-plugin/mock/___mock.js';
import { restoreMock, setMock, getOriginal as _getOriginal } from '../vite-plugin/mock/index.js';

export type StoryParameters = moduleMockParameter | Record<string, unknown>;

const getModuleMockState = (parameters: StoryParameters): moduleMockParameter['moduleMock'] => {
  const state = (parameters as Partial<moduleMockParameter>).moduleMock;
  if (!state) {
    throw new Error('moduleMock parameter is not configured for this story');
  }
  return state;
};

const hookFn = <T extends (...args: any[]) => any>(hook: (fn1: Mock<T>) => void) => {
  const fnSrc = fn();
  mocks.delete(fnSrc);

  const func = Object.assign((...args: unknown[]): unknown => {
    const result = fnSrc(...(args as Parameters<T>));
    hook(fnSrc as never);
    return result;
  }, fnSrc);
  func.bind(fnSrc);
  Object.defineProperty(func, '_isMockFunction', { value: true });
  Object.defineProperty(func, 'mock', {
    get: () => {
      return fnSrc.mock;
    },
  });
  return func as Mock<T> & { originalValue?: unknown };
};

export const createMock = <T extends (...args: any[]) => unknown>(module: T): ModuleMock<T> => {
  const fn = hookFn<T>(() => {
    (fn as ModuleMock<T>).__event?.();
  });

  const original = setMock(module as AnyFunction, fn as never);
  fn.mockRestore = () => {
    restoreMock(module as AnyFunction);
  };

  return Object.assign(fn, {
    __module: module,
    __name: `${String(original.name)}`,
  }) as ModuleMock<T>;
};

export const getOriginal = <T extends (...args: any[]) => unknown>(module: T): T => {
  return _getOriginal(module as AnyFunction) as T;
};

export const getMock = <T extends (...args: any[]) => unknown>(
  parameters: StoryParameters,
  module: T
): ModuleMock<T> => {
  const mock = getModuleMockState(parameters).mocks?.find((m) => m.__module === module);
  if (!mock) throw new Error("Can't find mock");
  return mock as unknown as ModuleMock<T>;
};

export const resetMock = (parameters: StoryParameters): void => {
  getModuleMockState(parameters).mocks?.forEach((mock) => {
    mock.mockReset();
  });
};

export const clearMock = (parameters: StoryParameters): void => {
  getModuleMockState(parameters).mocks?.forEach((mock) => {
    mock.mockClear();
  });
};

export const render = (parameters: StoryParameters, args?: { [key: string]: unknown }): void => {
  getModuleMockState(parameters).render(args);
};
