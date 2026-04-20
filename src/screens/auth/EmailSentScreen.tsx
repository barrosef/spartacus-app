import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { Button } from "../../components/ui/Button";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { getProjectId } from "../../lib/api";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export function EmailSentScreen({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function handleResend() {
    setResending(true);
    setMessage(null);
    try {
      const res = await fetch(`${BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Project-Id": getProjectId(),
        },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMessage({ text: "Novo e-mail enviado com sucesso.", error: false });
      } else {
        setMessage({ text: "Não foi possível reenviar. Tente novamente.", error: true });
      }
    } catch {
      setMessage({ text: "Erro de conexão. Verifique sua internet.", error: true });
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <SafeScreen>
        <View style={styles.topGlow} pointerEvents="none" />
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>✉️</Text>
          </View>

          <Text style={styles.heading}>E-mail enviado</Text>
          <Text style={styles.subheading}>Confirme seu cadastro</Text>

          <Text style={styles.body}>
            Enviamos um link de confirmação para:
          </Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.body}>
            Verifique sua caixa de entrada (e o spam) e clique no link para continuar.
          </Text>

          {message && (
            <View style={[styles.messageBox, message.error && styles.messageError]}>
              <Text style={[styles.messageText, message.error && styles.messageTextError]}>
                {message.text}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Button
              variant="outline"
              label={resending ? "Enviando..." : "Reenviar e-mail"}
              onPress={handleResend}
              disabled={resending}
            />
          </View>
        </View>
      </SafeScreen>
    </>
  );
}

const styles = StyleSheet.create({
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 256,
    backgroundColor: colors.primaryGlow,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.xxl * 2 + spacing.lg,
    gap: spacing.md,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  icon: {
    fontSize: 44,
  },
  heading: {
    fontSize: 26,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
  },
  subheading: {
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
    color: colors.primary,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  email: {
    fontSize: 16,
    fontFamily: typography.fontBodySemiBold,
    color: colors.primary,
    textAlign: "center",
    marginVertical: spacing.xs,
  },
  messageBox: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    width: "100%",
  },
  messageError: {
    backgroundColor: "rgba(231, 76, 76, 0.1)",
    borderColor: "rgba(231, 76, 76, 0.3)",
  },
  messageText: {
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: "#4caf50",
    textAlign: "center",
  },
  messageTextError: {
    color: "#e74c4c",
  },
  footer: {
    width: "100%",
    marginTop: spacing.xl,
  },
});
