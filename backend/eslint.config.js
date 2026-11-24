import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import caseSensitiveImports from "../eslint-rules/case-sensitive-imports.js";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      "case-sensitive-paths": { rules: { match: caseSensitiveImports } },
    },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    rules: { "case-sensitive-paths/match": "error" },
  },
]);
