import { mergeConfig } from 'vitest/config';
import sharedConfig from '../../tools/vitest.shared';

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: [
      new URL('../../tools/setup-tests.ts', import.meta.url).pathname,
      new URL('./vitest.carbon-mock.tsx', import.meta.url).pathname,
    ],
  },
});
