import { createRequire } from 'module';
import path from 'path';
import { mergeConfig } from 'vite';
import { AddonOptions } from './types.js';
import { viteMockPlugin } from './vite-plugin/index.js';
import type { Options } from 'storybook/internal/types';
const require = createRequire(import.meta.url);

export const managerEntries = (entry: string[] = []): string[] => [
  ...entry,
  require.resolve('./manager.js'),
];

export const viteFinal = async (config: object, options: Options & AddonOptions) => {
  return mergeConfig(
    {
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
                ) || options.exclude?.({ id, code });
            // if (!exclude) {
            //   console.log('--', p);
            //   console.log(code.split('\n').filter((v) => v.includes('// node_modules')));
            // }
            return exclude;
          },
          debugPath: options.debugPath,
        }),
      ],
    },
    config
  );
};
