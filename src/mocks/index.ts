/* eslint-disable @typescript-eslint/no-explicit-any */

import { Mock, fn, mocks } from '@storybook/test';
import { ModuleMock, moduleMockParameter } from '../addons/ModuleMock/types.js';
import { restoreMock, setMock, getOriginal as _getOriginal } from '../vite-plugin//mock/index.js';

interface P {
  [name: string]: unknown;
}

const hookFn = <T, Y extends unknown[]>(hook: (fn1: Mock<Y, T>) => void) => {
  const fnSrc = fn();
  mocks.delete(fnSrc);

  const func = Object.assign((...args: unknown[]): unknown => {
    const result = fnSrc(...(args as Y));
    hook(fnSrc);
    return result;
  }, fnSrc);
  func.bind(fnSrc);
  Object.defineProperty(func, '_isMockFunction', { value: true });
  Object.defineProperty(func, 'mock', {
    get: () => {
      return fnSrc.mock;
    },
  });
  return func as Mock<Y, T> & { originalValue?: unknown };
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
