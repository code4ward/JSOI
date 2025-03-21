import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["**/dist/*.js"]), {
    extends: compat.extends("eslint:recommended"),

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.commonjs,
            ...globals.jest,
        },

        ecmaVersion: 13,
        sourceType: "module",
    },

    rules: {
        strict: 2,
        indent: 0,
        "linebreak-style": 0,
        quotes: 0,
        semi: 0,
        "no-cond-assign": 1,
        "no-constant-condition": 1,
        "no-duplicate-case": 1,
        "no-empty": 1,
        "no-ex-assign": 1,
        "no-extra-boolean-cast": 1,
        "no-extra-semi": 1,
        "no-fallthrough": 1,
        "no-func-assign": 1,
        "no-global-assign": 1,
        "no-implicit-globals": 2,
        "no-inner-declarations": ["error", "functions"],
        "no-irregular-whitespace": 2,
        "no-loop-func": 1,
        "no-multi-str": 1,
        "no-mixed-spaces-and-tabs": 1,
        "no-proto": 1,
        "no-sequences": 1,
        "no-throw-literal": 1,
        "no-unmodified-loop-condition": 1,
        "no-useless-call": 1,
        "no-useless-escape": 0,
        "no-void": 1,
        "no-with": 2,
        "wrap-iife": 0,
        "no-redeclare": 1,
        "no-unused-vars": 0,
        "no-sparse-arrays": 1,
    },
}]);