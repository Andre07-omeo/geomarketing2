import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // ✅ Désactiver TOUTES les règles problématiques
  {
    rules: {
      // Désactiver les règles TypeScript
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": "warn", // ou "off"
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      
      // Désactiver les règles générales
      "no-console": "off",
      "no-unused-vars": "warn", // ou "off"
      "no-undef": "off",
      "no-extra-semi": "off",
      
      // Désactiver les règles d'import
      "import/no-unresolved": "off",
      "import/no-dynamic-require": "off",
      "import/no-commonjs": "off",
      "import/no-extraneous-dependencies": "off",
      "import/no-cycle": "off",
      "import/prefer-default-export": "off",
    },
  },
]);

export default eslintConfig;