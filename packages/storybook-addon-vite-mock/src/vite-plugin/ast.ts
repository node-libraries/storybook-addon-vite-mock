import { Program, parse } from 'acorn';
import { simple } from 'acorn-walk';

/**
 * Resets AST node locations to 0 for sourcemap generation.
 */
export function setAstZero(ast: Program): void {
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

/**
 * Parses JavaScript/TypeScript output code into an acorn AST with zeroed positions.
 */
export function toAst(code: string): Program {
  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
  });
  setAstZero(ast);
  return ast;
}

/**
 * Checks if the AST imports `__esm` helper.
 */
export function isEsmImport(ast: Program): boolean {
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

/**
 * Checks if the module is simply re-exporting imported items (proxy module).
 */
export function isProxy(ast: Program): boolean {
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

/**
 * Checks if the module is a wrapped CommonJS module structure.
 */
export function isCommonJSWrap(ast: Program): boolean {
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
