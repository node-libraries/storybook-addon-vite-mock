import { mergeConfig } from 'vite';
import { AddonOptions } from './types.js';
import { viteMockPlugin } from './vite-plugin/index.js';
import type { Options } from '@storybook/types';

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
            return (
              code
                .split('\n')
                .some((line) =>
                  ['// node_modules/storybook-addon-vite-mock', '// node_modules/@storybook/'].find(
                    (v) => line.startsWith(v)
                  )
                ) || options.exclude?.({ id, code })
            );
          },
          debugPath: options.debugPath,
        }),
      ],
    },
    config
  );
};
