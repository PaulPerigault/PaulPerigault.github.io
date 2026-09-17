import tseslint from "typescript-eslint";
import angular from "angular-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@angular-eslint/component-selector": ["error", { type: "element", prefix: ["pp", "app"], style: "kebab-case" }],
      "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "pp", style: "camelCase" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["**/*.html"],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  },
  eslintConfigPrettier,
);
