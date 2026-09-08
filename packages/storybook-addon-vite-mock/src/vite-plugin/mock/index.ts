import type { ___setMock, ___getOriginal, AnyFunction } from './___mock.js';

export const setMock = (globalThis as typeof globalThis & { ___setMock: ___setMock }).___setMock;
export const getOriginal = (globalThis as typeof globalThis & { ___getOriginal: ___getOriginal })
  .___getOriginal;

export const restoreMock = <T extends AnyFunction>(func: T): T => {
  const original = getOriginal(func);
  setMock(func, original);
  return original;
};
