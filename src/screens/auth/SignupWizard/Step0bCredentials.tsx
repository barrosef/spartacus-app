import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SafeScreen } from "../../../components/ui/SafeScreen";
import { WizardHeader } from "../../../components/wizard/WizardHeader";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { useWizard } from "../../../context/WizardContext";
import { checkEmail } from "../../../lib/api";
import { colors, typography, spacing } from "../../../theme/tokens";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPassword(value: string) {
  return value.length >= 8;
}

export function Step0bCredentials() {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();

  const [email, setEmail] = useState(state.email);
  const [password, setPassword] = useState(state.password);
  const [confirmation, setConfirmation] = useState(state.password ? state.password : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingEmail, setCheckingEmail] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function handleEmailBlur() {
    if (!email.trim() || !isValidEmail(email)) {
      if (email.length > 0 && !isValidEmail(email)) {
        setErrors((e) => ({ ...e, email: "E-mail inválido" }));
      }
      return;
    }
    setErrors((e) => { const n = { ...e }; delete n.email; return n; });
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCheckingEmail(true);
    try {
      const { available } = await checkEmail(email.trim(), controller.signal);
      if (!available) {
        setErrors((e) => ({ ...e, email: "Este e-mail já está cadastrado" }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setCheckingEmail(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!isValidEmail(email)) e.email = "E-mail inválido";
    if (!isValidPassword(password)) e.password = "A senha deve ter no mínimo 8 caracteres";
    if (password !== confirmation) e.confirmation = "As senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    dispatch({ type: "SET_CREDENTIALS", payload: { email: email.trim(), password } });
    navigation.navigate("Step0cProject");
  }

  const canContinue =
    email.length > 0 &&
    password.length > 0 &&
    confirmation.length > 0 &&
    !checkingEmail &&
    !errors.email;

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={0}
        totalSteps={6}
        stepLabel="Criar Conta · Acesso"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>E-mail e Senha</Text>
          <Text style={styles.description}>
            Esses dados serão usados para acessar sua conta.
          </Text>

          <View style={styles.fields}>
            <Input
              label="E-mail"
              placeholder="Informe seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) {
                  setErrors((e) => { const n = { ...e }; delete n.email; return n; });
                }
              }}
              error={errors.email}
              onBlur={handleEmailBlur}
              rightIcon={
                checkingEmail ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : undefined
              }
            />

            <Input
              label="Senha"
              placeholder="Crie uma senha (mín. 8 caracteres)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              onBlur={() => {
                if (password.length > 0 && !isValidPassword(password)) {
                  setErrors((e) => ({ ...e, password: "A senha deve ter no mínimo 8 caracteres" }));
                } else {
                  setErrors((e) => { const n = { ...e }; delete n.password; return n; });
                }
              }}
            />

            <Input
              label="Confirmar senha"
              placeholder="Repita a senha"
              secureTextEntry
              value={confirmation}
              onChangeText={setConfirmation}
              error={errors.confirmation}
              onBlur={() => {
                if (confirmation.length > 0 && confirmation !== password) {
                  setErrors((e) => ({ ...e, confirmation: "As senhas não coincidem" }));
                } else {
                  setErrors((e) => { const n = { ...e }; delete n.confirmation; return n; });
                }
              }}
            />
          </View>

          <View style={styles.footer}>
            <Button
              label="Continuar"
              onPress={handleNext}
              disabled={!canContinue}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontSize: 24,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  fields: {
    gap: spacing.md + 4,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
