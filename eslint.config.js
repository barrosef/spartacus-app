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
  // ── Débito de migração (grandfathered) ─────────────────────────────────────
  // Arquivos que ainda usam Alert.alert de antes do DialogProvider. A regra
  // acima é ERROR para código novo; aqui fica desligada até a migração. Ao
  // migrar um arquivo para useDialog(), REMOVA-O desta lista.
  {
    files: [
      "src/screens/anamnese/StepReview.tsx",
      "src/screens/main/DonationsScreen.tsx",
      "src/screens/main/FeedScreen.tsx",
      "src/screens/main/PostWizardScreen.tsx",
      "src/screens/profile/AddressScreen.tsx",
      "src/screens/profile/ClassesScreen.tsx",
      "src/screens/profile/DependentsScreen.tsx",
      "src/screens/profile/GraduationScreen.tsx",
      "src/screens/profile/PersonalDataScreen.tsx",
      "src/screens/profile/ProfileScreen.tsx",
      "src/screens/staff/AttendanceApprovalScreen.tsx",
      "src/screens/staff/DonationApprovalScreen.tsx",
      "src/screens/staff/StaffAnamnesesScreen.tsx",
      "src/screens/staff/StaffGraduacoesScreen.tsx",
      "src/screens/staff/StaffMatriculasScreen.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
