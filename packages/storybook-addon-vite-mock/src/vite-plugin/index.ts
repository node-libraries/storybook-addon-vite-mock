import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { Plugin } from 'vite';
import { AddonOptions } from '../types.js';
import { getTopLevelImportNames, isCommonJSWrap, isEsmImport, isProxy, toAst } from './ast.js';
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
 * Built-in patterns for modules that should never be transformed by this plugin:
 * - Virtual modules
 * - Vite internal endpoints & clients
 * - Pre-bundled dependencies (deps/) & cache directories
 * - Storybook internals & Vite plugins
 * - Story files & Storybook configs
 */
export const DEFAULT_IGNORED_PATTERNS: RegExp[] = [
  /^\0/,
  /^virtual:/,
  /[\\/]@vite[\\/]/,
  /[\\/]vite[\\/]dist[\\/]client/,
  /\?html-proxy/,
  /\?raw/,
  /\?url/,
  /[\\/]node_modules[\\/](?:@vitejs[\\/]|vite-plugin-|@storybook[\\/]|storybook[\\/])/,
  /[\\/]node_modules[\\/]\.pnpm[\\/](?:@storybook\+|storybook@|vite-plugin-storybook)/,
  /\.stories\.[^.]+$/,
  /[\\/]\.storybook[\\/]/,
];

/**
 * Builds mock injection AST and re-export AST based on detected exports.
 */
function buildMockInjections(
  exports: Record<string, string>,
  topLevelImportNames: Set<string>
): {
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

  // Handle named exports: alias any exports that clash with top-level imports to prevent duplicate declaration SyntaxError
  const directExports: string[] = [];
  const aliasedExports: string[] = [];

  for (const [name] of namedExports) {
    if (topLevelImportNames.has(name)) {
      aliasedExports.push(
        `const ___mock_export_${name} = ___exports.${name}; export { ___mock_export_${name} as ${name} };`
      );
    } else {
      directExports.push(name);
    }
  }

  const exportStatements: string[] = [];
  if (directExports.length > 0) {
    exportStatements.push(`export const {${directExports.join(', ')}} = ___exports;`);
  }
  if (aliasedExports.length > 0) {
    exportStatements.push(...aliasedExports);
  }
  if (isDefault) {
    exportStatements.push(`export default ___exports.${DEFAULT};`);
  }

  const reExportCode = exportStatements.join('\n');

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
      if (
        !id.match(/\.(ts|js|tsx|jsx)(\?.*)?$/) ||
        id === VIRTUAL_MOCK_NAME ||
        DEFAULT_IGNORED_PATTERNS.some((pattern) => pattern.test(id)) ||
        exclude?.({ id, code })
      ) {
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

        const topLevelImportNames = getTopLevelImportNames(ast);
        const exports = removeExport(ast);
        if (Object.keys(exports).length > 0) {
          const { insertMockCode, reExportCode } = buildMockInjections(exports, topLevelImportNames);
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
