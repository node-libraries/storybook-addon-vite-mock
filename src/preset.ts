import { mergeConfig } from 'vite';
import { AddonOptions } from './types.js';
import { viteMockPlugin } from './vite-plugin/index.js';
import type { Options, StorybookConfig } from '@storybook/types';

export const managerEntries = (entry: string[] = []): string[] => [
  ...entry,
  require.resolve('./manager.js'),
];

export const viteFinal = async (config: object, options: Options & AddonOptions) => {
  return mergeConfig(
    {
      plugins: [
        viteMockPlugin({
          exclude: (id) => id.includes('?v=') || options.exclude?.(id),
        }),
      ],
    },
    config
  );
};

export const previewAnnotations: StorybookConfig['previewAnnotations'] = (entry = []) => [
  ...entry,
  require.resolve('./preview.js'),
];
