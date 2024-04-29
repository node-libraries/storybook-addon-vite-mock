/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@storybook/jest';
import { ModuleMock, moduleMockParameter } from '../addons/ModuleMock/types.js';
import { restoreMock, setMock, getOriginal as _getOriginal } from '../vite-plugin//mock/index.js';
import type { Parameters as P } from '@storybook/react';

const hookFn = <T, Y extends unknown[]>(hook: (fn: jest.Mock<T, Y>) => void) => {
  const fnSrc = jest.fn<T, Y>() as jest.Mock<T, Y>;
  const fn = Object.assign((...args: unknown[]): unknown => {
    const result = fnSrc(...(args as Y));
    hook(fnSrc);
    return result;
  }, fnSrc);
  fn.bind(fnSrc);
  Object.defineProperty(fn, 'mock', {
    get: () => {
      return fnSrc.mock;
    },
  });
  return fn as jest.Mock<T, Y> & { originalValue?: unknown };
};

export const createMock = <T extends (...args: any[]) => unknown>(module: T): ModuleMock<T> => {
  const fn = hookFn<ReturnType<T>, Parameters<T>>(() => {
    (fn as ModuleMock<T>).__event?.();
  });

  const original = setMock(module, fn as never);
  fn.mockRestore = () => {
    restoreMock(module);
  };

  return Object.assign(fn, {
    __module: module,
    __name: `${String(original.name)}`,
    __original: original as T,
  }) as ModuleMock<T>;
};

export const getOriginal = <T extends (...args: any[]) => unknown>(module: T) => {
  return _getOriginal(module);
};

export const getMock = <T extends (...args: any[]) => unknown>(
  parameters: P,
  module: T
): ModuleMock<T> => {
  const mock = (parameters as moduleMockParameter).moduleMock.mocks?.find((mock) => {
    return mock.__module === module;
  });
  if (!mock) throw new Error("Can't find mock");
  return mock as unknown as ModuleMock<T>;
};

export const resetMock = (parameters: P) => {
  (parameters as moduleMockParameter).moduleMock.mocks?.forEach((mock) => {
    return mock.mockReset();
  });
};

export const clearMock = (parameters: P) => {
  (parameters as moduleMockParameter).moduleMock.mocks?.forEach((mock) => {
    return mock.mockClear();
  });
};

export const render = (parameters: P, args?: { [key: string]: unknown }) => {
  (parameters as moduleMockParameter).moduleMock.render(args);
};
