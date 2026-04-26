import baseConfig from '@commons-oss/config-eslint/base';

export default [
  ...baseConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
