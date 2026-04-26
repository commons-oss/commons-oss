/**
 * Conventional Commits enforced via commit-msg husky hook.
 * Scope is optional but encouraged. Common scopes seed the convention; not exhaustive.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'header-max-length': [2, 'always', 100],
    'scope-enum': [
      1,
      'always',
      [
        'brand',
        'shell',
        'module',
        'modules',
        'api',
        'auth',
        'db',
        'ui',
        'i18n',
        'sdk',
        'config',
        'ci',
        'deps',
        'docs',
        'release',
        'repo',
      ],
    ],
  },
};
