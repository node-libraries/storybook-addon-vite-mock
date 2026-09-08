import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AssignmentExpression, ExportSpecifier, Program, Statement, parse } from 'acorn';
import { simple } from 'acorn-walk';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { Plugin } from 'vite';

const DEFAULT = '___default___';
const VIRTUAL_MOCK_NAME = 'virtual:___mock.js';
const MOCK_FILE = './mock/___mock.js';

export type Options = {
  exclude?: ({ id, code }: { id: string; code: string }) => boolean;
  excludeFromAst?: ({ id, code, ast }: { id: string; code: string; ast: Program }) => boolean;
  debugPath?: string;
};

function setAstZero(ast: Program): void {
  const zero = (node: { start: number; end: number }) => {
    node.start = node.end = 0;
  };
  simple(ast, {
    Identifier: zero,
    Literal: zero,
    Program: zero,
    FunctionDeclaration: zero,
    VariableDeclaration: zero,
    ClassDeclaration: zero,
    ImportDeclaration: zero,
    ExportNamedDeclaration: zero,
    ExportDefaultDeclaration: zero,
    ExportAllDeclaration: zero,
    MethodDefinition: zero,
  });
}

const toAst = (code: string) => {
  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
  });
  setAstZero(ast);
  return ast;
};

function isEsmImport(ast: Program) {
  let hasEsm = false;
  simple(ast, {
    ImportDeclaration(node) {
      if (
        node.specifiers.some(
          (specifier) =>
            'imported' in specifier &&
            'name' in specifier.imported &&
            specifier.imported.name === '__esm'
        )
      ) {
        hasEsm = true;
      }
    },
  });
  return hasEsm;
}

function isProxy(ast: Program) {
  const imports = new Set<string>();
  const exports = new Set<string>();

  simple(ast, {
    ImportSpecifier(node) {
      if ('name' in node.imported) imports.add(node.imported.name);
    },
    ExportSpecifier(node) {
      if ('name' in node.exported) exports.add(node.exported.name);
    },
    ExportNamedDeclaration(node) {
      if (node.declaration) {
        if ('declarations' in node.declaration) {
          node.declaration.declarations.forEach((decl) => {
            if ('name' in decl.id) exports.add(decl.id.name);
          });
        } else if (node.declaration.id) {
          exports.add(node.declaration.id.name);
        }
      }
      if (node.specifiers) {
        node.specifiers.forEach((specifier) => {
          if ('name' in specifier.local) exports.add(specifier.local.name);
        });
      }
    },
  });
  return Array.from(exports).every((name) => imports.has(name)) && exports.size > 0;
}

function convertCommonJS(ast: Program) {
  let type: 'module' | 'exports' | undefined = undefined;
  simple(ast, {
    AssignmentExpression(node: AssignmentExpression) {
      if (node.left.type === 'MemberExpression' && node.left.object.type === 'Identifier') {
        if (
          node.left.object.name === 'module' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'exports'
        ) {
          type = 'module';
        } else if (node.left.object.name === 'exports') {
          type = 'exports';
        }
      }
    },
  });
  if (type) {
    const header = toAst(`require("${VIRTUAL_MOCK_NAME}");`);
    const exports = type === 'module' ? 'module.exports' : 'exports';
    const footer = toAst(`${exports} = ___createCommonMock(${exports})`);
    const index = ast.body.findIndex((v) => v.type !== 'ExpressionStatement' || !v.directive);
    ast.body.splice(Math.max(0, index), 0, ...header.body);
    ast.body.push(...footer.body);
  }
  return type;
}

function removeExport(ast: Program) {
  const exports: Record<string, string> = {};

  ast.body = ast.body.flatMap((node) => {
    if (node.type === 'ExportNamedDeclaration' && !node.source) {
      if (
        node.declaration?.type === 'VariableDeclaration' &&
        node.declaration.declarations?.[0].id.type === 'Identifier'
      ) {
        const name = node.declaration.declarations[0].id.name;
        exports[name] = name;
        return [node.declaration];
      }
      if (
        node.declaration?.type === 'ClassDeclaration' &&
        node.declaration.id.type === 'Identifier'
      ) {
        const name = node.declaration.id.name;
        exports[name] = name;
        return [node.declaration];
      }
      if (
        node.declaration?.type === 'FunctionDeclaration' &&
        node.declaration.id.type === 'Identifier'
      ) {
        const name = node.declaration.id.name;
        exports[name] = name;
        return [node.declaration];
      }
      if (node.specifiers) {
        const names = node.specifiers.flatMap((v: ExportSpecifier) => {
          if (v.exported.type === 'Identifier' && v.local.type === 'Identifier') {
            return [
              [v.exported.name === 'default' ? DEFAULT : v.exported.name, v.local.name] as const,
            ];
          }
          return [];
        });
        names.forEach(([name, value]) => {
          exports[name] = value;
        });
      }

      return [];
    }

    if (node.type === 'ExportDefaultDeclaration') {
      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        exports[DEFAULT] = node.declaration.id.name;
        return [node.declaration];
      }
      if (
        node.declaration.type === 'ArrowFunctionExpression' ||
        node.declaration.type === 'FunctionDeclaration' ||
        node.declaration.type === 'Literal' ||
        node.declaration.type === 'ClassDeclaration' ||
        node.declaration.type === 'ObjectExpression'
      ) {
        exports[DEFAULT] = DEFAULT;
        return {
          type: 'VariableDeclaration',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: DEFAULT,
                start: node.declaration.start,
                end: node.declaration.end,
              },
              init: node.declaration as never,

              start: node.declaration.start,
              end: node.declaration.end,
            },
          ],
          kind: 'const',
          start: node.start,
          end: node.end,
        };
      }
      if (
        node.declaration.type === 'CallExpression' &&
        node.declaration.callee.type === 'Identifier'
      ) {
        exports[DEFAULT] = DEFAULT;
        return {
          type: 'VariableDeclaration',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: DEFAULT,
                start: node.declaration.start,
                end: node.declaration.end,
              },
              init: node.declaration as never,
              start: node.declaration.start,
              end: node.declaration.end,
            },
          ],
          kind: 'const',
          start: node.start,
          end: node.end,
        };
      }
      if (node.declaration.type === 'Identifier') {
        exports[DEFAULT] = node.declaration.name;
        return [];
      }
      throw new Error('Not implemented');
    }
    return [node];
  });

  return exports;
}

const convertPrivate = (ast: Program) => {
  const outsides = ['ExportAllDeclaration', 'ImportDeclaration'];
  const imports = ast.body.filter(
    (node) =>
      outsides.includes(node.type) ||
      ('source' in node && node.source) ||
      (node.type === 'ExpressionStatement' && node.directive)
  );
  const exports = ast.body.filter((v) => !imports.includes(v));
  const node: Statement = {
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier',
          name: '___exports',
          start: 0,
          end: 0,
        },
        init: {
          type: 'CallExpression',
          callee: {
            type: 'ArrowFunctionExpression',
            async: false,
            params: [],
            body: {
              type: 'BlockStatement',
              body: exports as Statement[],
              start: 0,
              end: 0,
            },
            start: ast.body[0].start,
            end: ast.body[0].end,
            generator: false,
            expression: false,
          },
          arguments: [],
          start: ast.body[0].start,
          end: ast.body[0].end,
          optional: true,
        },
        start: 0,
        end: 0,
      },
    ],
    kind: 'const',
    start: 0,
    end: 0,
  };

  ast.body = [...imports, node];
};

function isCommonJSWrap(ast: Program) {
  const VariableDeclaration = ast.body[0];
  const ExportNamedDeclaration = ast.body[1];
  if (VariableDeclaration?.type === 'VariableDeclaration') {
    const declaration = VariableDeclaration.declarations[0];
    if (
      declaration?.init?.type === 'ObjectExpression' &&
      declaration.init.properties.length === 0
    ) {
      if (ExportNamedDeclaration?.type === 'ExportNamedDeclaration') {
        const specifier = ExportNamedDeclaration.specifiers[0];

        return (
          specifier?.exported.type === 'Identifier' &&
          (specifier.exported.name === '__exports' || specifier.exported.name === '__module')
        );
      }
    }
  }
  return false;
}

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
        const code = fs.readFileSync(
          path.resolve(path.dirname(fileURLToPath(import.meta.url)), MOCK_FILE),
          'utf-8'
        );
        return code;
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
        if (Object.keys(exports).length) {
          const isDefault = Object.keys(exports).find((v) => v === DEFAULT);
          const namedExports = Object.entries(exports).filter(([name]) => name !== DEFAULT);
          if (Object.keys(exports).length) {
            const insertMockCode = [`import "${VIRTUAL_MOCK_NAME}";`];
            if (isDefault && namedExports.length === 0)
              insertMockCode.push(
                `
            if(typeof ${exports[DEFAULT]} === 'function')
              return ___createMock({${DEFAULT}:${exports[DEFAULT]}});
            return {${DEFAULT}:___createMock(${exports[DEFAULT]})};`
              );
            else
              insertMockCode.push(
                `return ___createMock({${Object.entries(exports)
                  .map(([name, value]) => (name === value ? name : `${name}: ${value}`))
                  .join(', ')}});`
              );
            const insertMockAst = toAst(insertMockCode.join('\n'));

            ast.body.push(...insertMockAst.body);
            convertPrivate(ast);

            const exportAst = toAst(
              (namedExports.length
                ? `export const {${namedExports.map(([name]) => name).join(', ')}} = ___exports;`
                : '') + (isDefault ? `\nexport default ___exports.${DEFAULT}` : '')
            );
            ast.body.push(...exportAst.body);
          }
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
