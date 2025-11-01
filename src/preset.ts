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

export const viteFinal: ViteFinal = async (config, options) => {
  const o = options as Options & AddonOptions;
  const { mergeConfig } = await import('vite');
  return mergeConfig(config, {
    plugins: [
      viteMockPlugin({
        exclude: ({ id, code }) => {
          const p = path.dirname(id);
          if (['@storybook', 'storybook@'].some((v) => p.includes(v))) return true;
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
                ].find((v) => line.startsWith(v))
              ) || o.exclude?.({ id, code });
          // if (!exclude) {
          //   console.log('--', p);
          //   console.log(code.split('\n').filter((v) => v.includes('// node_modules')));
          // }
          return exclude;
        },
        debugPath: o.debugPath,
      }),
    ],
  });
};
