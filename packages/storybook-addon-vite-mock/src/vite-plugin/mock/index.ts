import type { ___setMock, ___getOriginal } from './___mock.js';

export const setMock = (globalThis as typeof globalThis & { ___setMock: ___setMock }).___setMock;
export const getOriginal = (globalThis as typeof globalThis & { ___getOriginal: ___getOriginal })
  .___getOriginal;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const restoreMock = <T extends Function>(func: T) => {
  const original = getOriginal(func);
  setMock(func, original);
  return original;
};
