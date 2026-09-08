export type AddonOptions = {
  exclude: ({ id, code }: { id: string; code: string }) => boolean;
  debugPath?: string;
};
