import reactConfig from "./react.mjs";
import next from "@next/eslint-plugin-next";

export default [
  ...reactConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
];
