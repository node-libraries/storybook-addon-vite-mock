import type { ___setMock, ___getOriginal, AnyFunction } from './___mock.js';

export const setMock: ___setMock = (func, custom) => {
  const fn = (globalThis as typeof globalThis & { ___setMock?: ___setMock }).___setMock;
  if (!fn) {
    throw new Error('___setMock is not initialized. Ensure virtual:___mock.js is loaded.');
  }
  return fn(func, custom);
};

export const getOriginal: ___getOriginal = (func) => {
  const fn = (globalThis as typeof globalThis & { ___getOriginal?: ___getOriginal }).___getOriginal;
  if (!fn) {
    throw new Error('___getOriginal is not initialized. Ensure virtual:___mock.js is loaded.');
  }
  return fn(func);
};

export const restoreMock = <T extends AnyFunction>(func: T): T => {
  const original = getOriginal(func);
  setMock(func, original);
  return original;
};
