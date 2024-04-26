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

const funcMap: Record<symbol, { original: Function; custom: Function }> = {};
const ___setMock = <T extends Function>(func: T, custom: T) => {
  const key = '___symbol' in func && (func.___symbol as symbol);
  if (!key) throw new Error(`Function is not a mock '${func.name}'`);
  funcMap[key] = { ...funcMap[key], custom };
  return funcMap[key].original as T;
};
const ___getOriginal = <T extends Function>(func: T) => {
  const key = '___symbol' in func && (func.___symbol as symbol);
  if (!key) throw new Error(`Function is not a mock '${func.name}'`);
  return funcMap[key].original as T;
};

const ___createMock = (exp: Record<string, unknown>) => {
  const v = Object.entries(exp).map(([key, original]) => {
    if (typeof original === 'function' && !('___symbol' in original)) {
      const ___symbol = Symbol(key);
      const func = (...params: unknown[]) => {
        const f = funcMap[func.___symbol].custom;
        return f(...params);
      };
      func.___symbol = ___symbol;
      funcMap[___symbol] = { original, custom: original };
      Object.entries(original).forEach(([k, v]) => {
        func[k as keyof typeof func] = v;
      });
      Object.defineProperty(func, 'name', { value: key });
      return [key, func];
    }
    return [key, original];
  });
  return Object.fromEntries(v);
};

const ___createCommonMock = (exp: NodeJS.Module['exports']) => {
  if (typeof exp !== 'object') return exp;

  if (typeof exp === 'function') {
    const ___symbol = Symbol(exp.name);
    const func = (...args: unknown[]) => {
      const f = funcMap[func.___symbol].custom;
      return f(...args);
    };
    func.___symbol = ___symbol;
    funcMap[___symbol] = { original: exp, custom: exp };

    Object.setPrototypeOf(func, Object.getPrototypeOf(exp));
    const prototype = Object.getPrototypeOf(exp);
    const clonedObject = Object.create(prototype);
    return Object.assign(clonedObject, exp);
  }
  Object.entries(exp).forEach(([key, original]) => {
    if (
      typeof original === 'function' &&
      !('___symbol' in original) &&
      (Object.getOwnPropertyDescriptors(original).length.value ?? 0) === 0
    ) {
      const ___symbol = Symbol(key);
      const func = (...params: unknown[]) => {
        const f = funcMap[func.___symbol].custom;
        return f(...params);
      };
      func.___symbol = ___symbol;
      funcMap[___symbol] = { original, custom: original };
      Object.entries(original).forEach(([k, v]) => {
        func[k as keyof typeof func] = v;
      });
      exp[key] = func;
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
