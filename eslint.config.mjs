import angular from "@angular-eslint/eslint-plugin";
import angularTemplate from "@angular-eslint/eslint-plugin-template";
import templateParser from "@angular-eslint/template-parser";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@angular-eslint": angular,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...angular.configs.recommended.rules,
      "@angular-eslint/component-selector": ["error", { type: "element", prefix: ["pp", "app"], style: "kebab-case" }],
      "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "pp", style: "camelCase" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["**/*.html"],
    plugins: { "@angular-eslint/template": angularTemplate },
    languageOptions: { parser: templateParser },
    rules: { ...angularTemplate.configs.recommended.rules },
  },
  eslintConfigPrettier,
];
