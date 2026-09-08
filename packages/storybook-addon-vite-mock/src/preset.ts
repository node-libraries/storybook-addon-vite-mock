import { createRequire } from 'module';
import path from 'path';
import { Options } from 'storybook/internal/types';
import { AddonOptions } from './types.js';
import { viteMockPlugin } from './vite-plugin/index.js';
import type { ViteFinal } from '@storybook/builder-vite';

const require = createRequire(import.meta.url);

export const managerEntries = (entry: string[] = []): string[] => [
  ...entry,
  require.resolve('./manager.js'),
];

const IGNORED_ID_PATTERNS = [
  /[\\/]sb-vite[\\/]/,
  /[\\/]\.cache[\\/]/,
  /[\\/]deps[\\/]/,
  /@storybook/,
  /storybook@/,
  /storybook[\\/]/,
  /vite-plugin-storybook/,
];

export const viteFinal: ViteFinal = async (config, options) => {
  const o = options as Options & AddonOptions;
  const { mergeConfig } = await import('vite');
  return mergeConfig(config, {
    plugins: [
      viteMockPlugin({
        exclude: ({ id, code }) => {
          if (IGNORED_ID_PATTERNS.some((pattern) => pattern.test(id))) {
            return true;
          }
          const basename = path.basename(id);
          if (basename.startsWith('@storybook') || basename.startsWith('storybook')) {
            return true;
          }
          const exclude =
            code
              .split('\n')
              .some((line) =>
                [
                  '// node_modules/.cache',
                  '// node_modules/storybook-addon-vite-mock',
                  '// node_modules/@storybook',
                  '// node_modules/storybook@',
                  '// node_modules/.pnpm/storybook-addon-vite-mock',
                  '// node_modules/.pnpm/@storybook',
                  '// node_modules/.pnpm/storybook@',
                  '// node_modules/.pnpm/vite-plugin-storybook',
                ].find((v) => line.startsWith(v))
              ) || Boolean(o.exclude?.({ id, code }));
          return exclude;
        },
        debugPath: o.debugPath,
      }),
    ],
  });
};