import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "android", "ios", ".expo", "dist", "build", "**/*.js"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Proíbe o Alert.alert() nativo (popup cinza do SO, fora da identidade
      // visual). Diálogos voltados ao usuário devem usar useDialog() do
      // DialogProvider (src/components/ui/DialogProvider.tsx).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='Alert'][callee.property.name='alert']",
          message:
            "Não use Alert.alert() (popup cinza nativo, fora da identidade). Use useDialog() — alert()/confirm() do DialogProvider.",
        },
      ],
    },
  },
);
