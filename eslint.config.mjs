import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.d.ts",
      "next-env.d.ts",
      "public/**",
      "coverage/**",
      ".vercel/**",
      ".turbo/**",
      ".contentlayer/**",
      "storybook-static/**",
      "src/lib/generated/**/*"  // Ignore generated code
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-var": "error"
    }
  }
];

export default eslintConfig;
