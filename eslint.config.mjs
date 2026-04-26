import baseConfig from "@commons-oss/config-eslint/base";

export default [
  ...baseConfig,
  {
    ignores: ["packages/brand/**", "**/*.json"],
  },
];
