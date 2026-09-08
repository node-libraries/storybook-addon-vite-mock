import type { Program } from 'acorn';

export type AddonOptions = {
  exclude?: ({ id, code }: { id: string; code: string }) => boolean | undefined;
  excludeFromAst?: ({ id, code, ast }: { id: string; code: string; ast: Program }) => boolean | undefined;
  debugPath?: string;
};
