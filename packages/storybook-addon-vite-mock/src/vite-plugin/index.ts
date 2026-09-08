import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { Plugin } from 'vite';
import { AddonOptions } from '../types.js';
import { isCommonJSWrap, isEsmImport, isProxy, toAst } from './ast.js';
import {
  DEFAULT,
  VIRTUAL_MOCK_NAME,
  convertCommonJS,
  convertPrivate,
  removeExport,
} from './transform.js';

const MOCK_FILE = './mock/___mock.js';

export type Options = AddonOptions;

/**
 * Builds mock injection AST and re-export AST based on detected exports.
 */
function buildMockInjections(exports: Record<string, string>): {
  insertMockCode: string[];
  reExportCode: string;
} {
  const isDefault = Object.keys(exports).includes(DEFAULT);
  const namedExports = Object.entries(exports).filter(([name]) => name !== DEFAULT);

  const insertMockCode = [`import "${VIRTUAL_MOCK_NAME}";`];
  if (isDefault && namedExports.length === 0) {
    insertMockCode.push(`
      if (typeof ${exports[DEFAULT]} === 'function')
        return ___createMock({${DEFAULT}:${exports[DEFAULT]}});
      return {${DEFAULT}:___createMock(${exports[DEFAULT]})};
    `);
  } else {
    insertMockCode.push(
      `return ___createMock({${Object.entries(exports)
        .map(([name, value]) => (name === value ? name : `${name}: ${value}`))
        .join(', ')}});`
    );
  }

  const reExportCode =
    (namedExports.length
      ? `export const {${namedExports.map(([name]) => name).join(', ')}} = ___exports;`
      : '') + (isDefault ? `\nexport default ___exports.${DEFAULT};` : '');

  return { insertMockCode, reExportCode };
}

/**
 * Vite plugin for storybook-addon-vite-mock.
 */
export const viteMockPlugin = (props?: Options): Plugin => {
  const { debugPath, exclude, excludeFromAst } = props ?? {};

  if (debugPath) {
    if (fs.existsSync(debugPath)) {
      fs.rmSync(debugPath, { recursive: true });
    }
    fs.mkdirSync(debugPath, { recursive: true });
  }

  return {
    name: 'storybook-addon-vite-mock',
    resolveId(id) {
      if (id === VIRTUAL_MOCK_NAME) {
        return VIRTUAL_MOCK_NAME;
      }
      return null;
    },
    load(id) {
      if (id === VIRTUAL_MOCK_NAME) {
        return fs.readFileSync(
          path.resolve(path.dirname(fileURLToPath(import.meta.url)), MOCK_FILE),
          'utf-8'
        );
      }
    },
    transform(code, id) {
      if (!id.match(/\.(ts|js)(\?.*)?$/) || id === VIRTUAL_MOCK_NAME || exclude?.({ id, code })) {
        return null;
      }

      const ast = toAst(code);
      if (excludeFromAst?.({ id, code, ast })) return null;

      if (isEsmImport(ast) || isCommonJSWrap(ast) || isProxy(ast)) {
        return null;
      }

      const normalizePath = path.relative(
        path.normalize(path.resolve('./')),
        path.normalize(id.replaceAll('?', '-').replaceAll('\0', ''))
      );
      const name = normalizePath
        .replaceAll('/', '-')
        .replaceAll('\\', '-')
        .replaceAll(':', '-')
        .replaceAll('?', '-');

      try {
        if (debugPath) {
          fs.writeFileSync(path.resolve(debugPath, name), code);
          fs.writeFileSync(
            path.resolve(debugPath, `${name}.json`),
            JSON.stringify(
              ast,
              (_, value) => (typeof value === 'bigint' ? Number(value) : value),
              2
            )
          );
        }

        const exports = removeExport(ast);
        if (Object.keys(exports).length > 0) {
          const { insertMockCode, reExportCode } = buildMockInjections(exports);
          const insertMockAst = toAst(insertMockCode.join('\n'));

          ast.body.push(...insertMockAst.body);
          convertPrivate(ast);

          const exportAst = toAst(reExportCode);
          ast.body.push(...exportAst.body);
        } else {
          if (!convertCommonJS(ast)) return null;
        }

        const sourceMapGenerator = new SourceMapGenerator({
          file: normalizePath,
        });
        const newCode = generate(ast, { sourceMap: sourceMapGenerator });

        if (debugPath) {
          fs.writeFileSync(path.resolve(debugPath, `${name}-out.js`), newCode);
        }

        const sourceMap = sourceMapGenerator.toString();
        return { code: newCode, map: sourceMap };
      } catch (e) {
        if (debugPath) {
          fs.writeFileSync(
            path.resolve(debugPath, `${name}-error.json`),
            JSON.stringify(ast, null, 2)
          );
        }
        console.error(e);
      }
      return null;
    },
  };
};

export * from './ast.js';
export * from './transform.js';
