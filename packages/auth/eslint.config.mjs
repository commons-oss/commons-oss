import baseConfig from '@commons-oss/config-eslint/base';

export default [
  ...baseConfig,
  {
    // Auth callback + provisioning runs BEFORE tenant context exists, so it
    // is allowed to import the unscoped `@commons-oss/db/internal` handle.
    files: ['**/src/provisioning.ts', '**/src/providers/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  { ignores: ['dist/**'] },
];
