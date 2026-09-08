/* eslint-disable @typescript-eslint/no-unsafe-function-type */
export type ___setMock = typeof ___setMock;
export type ___getOriginal = typeof ___getOriginal;

const setGlobalFunction = <
  T extends { [key: string]: Function },
  G extends typeof globalThis & T,
  K extends keyof G
>(
  func: T
) => {
  Object.entries(func).forEach(([key, value]) => {
    (globalThis as G)[key as K] = value as G[K];
  });
};

const createFunction = (key: string, original: Function) => {
  if (
    Object.getOwnPropertyDescriptor(original, 'prototype') &&
    Object.getOwnPropertyDescriptor(original, 'name')?.value !== ''
  )
    return original;
  const ___symbol = Symbol(key);
  const func = (...params: unknown[]) => {
    const f = funcMap[___symbol].custom;
    return f(...params);
  };
  Object.defineProperty(func, '___symbol', { value: ___symbol });
  funcMap[___symbol] = { original, custom: original };
  Object.entries(original).forEach(([k, v]) => {
    (func as typeof func & { [key: string]: unknown })[k as keyof typeof func] = v;
  });
  Object.defineProperty(func, 'name', { value: key });
  return func;
};

const getSymbol = (func: Function) => {
  return Object.getOwnPropertyDescriptor(func, '___symbol')?.value;
};

const funcMap: Record<symbol, { original: Function; custom: Function }> = {};
const ___setMock = <T extends Function>(func: T, custom: T) => {
  const key = getSymbol(func);
  if (!key) throw new Error(`Function is not a mock '${func.name}'`);
  funcMap[key] = { ...funcMap[key], custom };
  return funcMap[key].original as T;
};

const ___getOriginal = <T extends Function>(func: T) => {
  const key = getSymbol(func);
  if (!key) throw new Error(`Function is not a mock '${func.name}'`);
  return funcMap[key].original as T;
};

const ___createMock = (exp: Record<string, unknown>) => {
  const v = Object.entries(exp).map(([key, original]) => {
    if (typeof original === 'function' && !getSymbol(original)) {
      const func = createFunction(key, original);
      return [key, func];
    }
    return [key, original];
  });
  return Object.fromEntries(v);
};

const ___createCommonMock = (exp: NodeJS.Module['exports']) => {
  if (typeof exp !== 'object') return exp;

  if (typeof exp === 'function') {
    const func = createFunction(exp.name, exp);
    Object.setPrototypeOf(func, Object.getPrototypeOf(exp));
    const prototype = Object.getPrototypeOf(exp);
    const clonedObject = Object.create(prototype);
    return Object.assign(clonedObject, exp);
  }
  Object.entries(exp).forEach(([key, original]) => {
    if (typeof original === 'function' && !getSymbol(original)) {
      if (!original.prototype || Object.keys(original.prototype).length === 0) {
        const func = createFunction(key, original);
        try {
          exp[key] = func;
        } catch {}
      }
    }
  });
  return exp;
};

setGlobalFunction({
  ___setMock,
  ___createMock,
  ___createCommonMock,
  ___getOriginal,
});
