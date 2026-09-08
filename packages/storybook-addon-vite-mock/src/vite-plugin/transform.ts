import { AssignmentExpression, ExportSpecifier, Program, Statement } from 'acorn';
import { simple } from 'acorn-walk';
import { toAst } from './ast.js';

export const DEFAULT = '___default___';
export const VIRTUAL_MOCK_NAME = 'virtual:___mock.js';

/**
 * Rewrites CommonJS assignment (module.exports = ... or exports = ...) with mock wrapping.
 */
export function convertCommonJS(ast: Program): 'module' | 'exports' | undefined {
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

/**
 * Extracts export statements from the AST, replaces them with local declarations,
 * and returns a map of exportName -> localIdentifierName.
 */
export function removeExport(ast: Program): Record<string, string> {
  const exports: Record<string, string> = {};

  ast.body = ast.body.flatMap((node) => {
    if (node.type === 'ExportNamedDeclaration' && !node.source) {
      if (
        node.declaration?.type === 'VariableDeclaration' &&
        node.declaration.declarations?.[0]?.id.type === 'Identifier'
      ) {
        const name = node.declaration.declarations[0].id.name;
        exports[name] = name;
        return [node.declaration];
      }
      if (
        node.declaration?.type === 'ClassDeclaration' &&
        node.declaration.id?.type === 'Identifier'
      ) {
        const name = node.declaration.id.name;
        exports[name] = name;
        return [node.declaration];
      }
      if (
        node.declaration?.type === 'FunctionDeclaration' &&
        node.declaration.id?.type === 'Identifier'
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

/**
 * Wraps body statements (excluding imports) into an IIFE `const ___exports = (() => { ... })();`
 */
export function convertPrivate(ast: Program): void {
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
            start: ast.body[0]?.start ?? 0,
            end: ast.body[0]?.end ?? 0,
            generator: false,
            expression: false,
          },
          arguments: [],
          start: ast.body[0]?.start ?? 0,
          end: ast.body[0]?.end ?? 0,
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
}
