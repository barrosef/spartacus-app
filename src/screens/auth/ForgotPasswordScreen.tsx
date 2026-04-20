import React, { useState } from "react";
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
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuthNavigation } from "../../navigation/AuthNavContext";
import { auth } from "../../lib/firebase";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { colors, typography, spacing, radius } from "../../theme/tokens";

type Screen = "form" | "sent";

export function ForgotPasswordScreen() {
  const navigation = useAuthNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("form");

  async function handleSend() {
    if (!email.trim()) {
      setError("Informe o e-mail");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setScreen("sent");
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "auth/user-not-found") {
        setError("E-mail não encontrado em nossa base.");
      } else if (err.code === "auth/invalid-email") {
        setError("E-mail inválido.");
      } else {
        setError("Erro ao enviar link. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (screen === "sent") {
    return (
      <>
        <StatusBar style="light" />
        <SafeScreen noPadding>
          <View style={styles.sentContainer}>
            <View style={styles.iconCircle}>
              <Feather name="mail" size={48} color={colors.primary} />
            </View>
            <Text style={styles.sentTitle}>E-mail enviado</Text>
            <Text style={styles.sentMessage}>
              Enviamos um link de recuperação para{"\n"}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Text style={styles.sentInstructions}>
              Verifique sua caixa de entrada (e a pasta de spam) e clique no
              link para criar uma nova senha.
            </Text>
            <Button
              label="Voltar para o login"
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
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
            {/* Back button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather
                name="chevron-left"
                size={24}
                color={colors.foreground}
              />
            </TouchableOpacity>

            <View style={styles.iconArea}>
              <View style={styles.iconCircle}>
                <Feather name="lock" size={48} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.title}>Esqueceu a senha?</Text>
            <Text style={styles.subtitle}>
              Informe o e-mail cadastrado e enviaremos um link para você criar
              uma nova senha.
            </Text>

            <View style={styles.form}>
              <Input
                label="E-mail"
                placeholder="Informe seu e-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                error={error ?? undefined}
              />

              <Button
                label="Enviar link de recuperação"
                onPress={handleSend}
                loading={loading}
                disabled={!email.trim()}
                style={styles.submitBtn}
              />

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.goBack()}
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

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginTop: spacing.md,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconArea: {
    alignItems: "center",
    marginTop: spacing.lg,
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
  form: {
    gap: spacing.md + 4,
  },
  submitBtn: {
    marginTop: spacing.sm,
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
  // Sent screen
  sentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  sentTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 26,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  sentMessage: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emailHighlight: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },
  sentInstructions: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  backBtn: {
    marginTop: spacing.xl,
    width: "100%",
    borderRadius: radius.md,
  },
});
