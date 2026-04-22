import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useAuthNavigation } from "../../navigation/AuthNavContext";
import { auth } from "../../lib/firebase";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { colors, typography, spacing, radius } from "../../theme/tokens";

interface ResetPasswordScreenProps {
  route?: { params?: { oobCode?: string } };
}

type Phase = "verifying" | "form" | "done" | "invalid";

export function ResetPasswordScreen({ route }: ResetPasswordScreenProps) {
  const navigation = useAuthNavigation();
  const oobCode = route?.params?.oobCode ?? "";
  const [phase, setPhase] = useState<Phase>("verifying");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setPhase("invalid");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setVerifiedEmail(email);
        setPhase("form");
      })
      .catch(() => setPhase("invalid"));
  }, [oobCode]);

  async function handleSubmit() {
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPhase("done");
    } catch (e) {
      setError(mapResetError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "verifying") {
    return (
      <>
        <StatusBar style="light" />
        <SafeScreen noPadding>
          <View style={styles.centered}>
            <Text style={styles.muted}>Verificando link...</Text>
          </View>
        </SafeScreen>
      </>
    );
  }

  if (phase === "invalid") {
    return (
      <>
        <StatusBar style="light" />
        <SafeScreen noPadding>
          <View style={styles.centered}>
            <View style={[styles.iconCircle, styles.iconCircleError]}>
              <Feather
                name="alert-triangle"
                size={48}
                color={colors.error}
              />
            </View>
            <Text style={styles.title}>Link inválido ou expirado</Text>
            <Text style={styles.subtitle}>
              Este link de recuperação não é mais válido. Solicite um novo
              para continuar.
            </Text>
            <Button
              label="Solicitar novo link"
              onPress={() => navigation.navigate("ForgotPassword")}
              style={styles.actionBtn}
            />
            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.backToLoginText}>Voltar para o login</Text>
            </TouchableOpacity>
          </View>
        </SafeScreen>
      </>
    );
  }

  if (phase === "done") {
    return (
      <>
        <StatusBar style="light" />
        <SafeScreen noPadding>
          <View style={styles.centered}>
            <View style={styles.iconCircle}>
              <Feather name="check-circle" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Senha redefinida</Text>
            <Text style={styles.subtitle}>
              Sua nova senha foi definida com sucesso. Você já pode entrar
              com ela.
            </Text>
            <Button
              label="Ir para o login"
              onPress={() => navigation.navigate("Login")}
              style={styles.actionBtn}
            />
          </View>
        </SafeScreen>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SafeScreen noPadding>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconArea}>
              <View style={styles.iconCircle}>
                <Feather name="lock" size={48} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.title}>Crie uma nova senha</Text>
            {verifiedEmail && (
              <Text style={styles.subtitle}>
                Redefinindo senha de{"\n"}
                <Text style={styles.emailHighlight}>{verifiedEmail}</Text>
              </Text>
            )}

            <View style={styles.form}>
              <Input
                label="Nova senha"
                placeholder="Mínimo 8 caracteres"
                secureTextEntry
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
              />
              <Input
                label="Confirme a nova senha"
                placeholder="Repita a senha"
                secureTextEntry
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setError(null);
                }}
                error={error ?? undefined}
              />

              <Button
                label="Definir nova senha"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!password || !confirm}
                style={styles.submitBtn}
              />

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.backToLoginText}>
                  Voltar para o login
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeScreen>
    </>
  );
}

function mapResetError(e: unknown): string {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case "auth/expired-action-code":
      case "auth/invalid-action-code":
        return "Link expirado ou inválido. Solicite um novo.";
      case "auth/weak-password":
        return "Senha muito fraca. Use pelo menos 8 caracteres.";
      case "auth/user-disabled":
        return "Esta conta está desativada.";
      case "auth/user-not-found":
        return "Usuário não encontrado.";
      default:
        return "Não foi possível redefinir a senha. Tente novamente.";
    }
  }
  return "Não foi possível redefinir a senha. Tente novamente.";
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconArea: {
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2,
    borderColor: "rgba(198,163,78,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleError: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 26,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  emailHighlight: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },
  muted: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
  },
  form: {
    gap: spacing.md + 4,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  actionBtn: {
    marginTop: spacing.lg,
    width: "100%",
    borderRadius: radius.md,
  },
  backToLogin: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  backToLoginText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
});
