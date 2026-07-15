import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { Button } from "../../components/ui/Button";
import { colors, typography, spacing, radius } from "../../theme/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../../assets/logo.png");

const STATUS_CONFIG: Record<string, { icon: string; title: string; message: string }> = {
  pending_approval: {
    icon: "⏳",
    title: "Conta em análise",
    message: "Suas informações estão sendo analisadas pela equipe do Spartacus. Você receberá uma notificação quando sua conta for aprovada.",
  },
  waiting_medical_history: {
    icon: "📋",
    title: "Preencha a anamnese",
    message: "Sua conta foi aprovada! Agora é necessário preencher a ficha de anamnese para completar o cadastro.",
  },
  pending_medical_history_approval: {
    icon: "⏳",
    title: "Anamnese em revisão",
    message: "Sua ficha de anamnese foi enviada e está sendo analisada pela equipe.",
  },
  waiting_registration_review: {
    icon: "✏️",
    title: "Revisão solicitada",
    message: "A equipe solicitou uma revisão nos seus dados cadastrais. Por favor, revise e reenvie.",
  },
  revised_registration: {
    icon: "⏳",
    title: "Revisão em análise",
    message: "Seus dados revisados foram enviados e estão sendo reavaliados.",
  },
  rejected: {
    icon: "❌",
    title: "Cadastro não aprovado",
    message: "Seu cadastro não foi aprovado. Entre em contato com a equipe para mais informações.",
  },
  expelled: {
    icon: "🚫",
    title: "Conta suspensa",
    message: "Sua conta foi suspensa. Entre em contato com a equipe do Spartacus.",
  },
  archived: {
    icon: "📦",
    title: "Conta arquivada",
    message: "Sua conta foi arquivada. Entre em contato para reativar.",
  },
  app_banned: {
    icon: "🚫",
    title: "Acesso bloqueado",
    message: "Seu acesso foi bloqueado pela equipe.",
  },
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Aguardando aprovação",
  waiting_medical_history: "Aguardando anamnese",
  pending_medical_history_approval: "Anamnese em revisão",
  waiting_registration_review: "Revisão solicitada",
  revised_registration: "Revisão em análise",
  rejected: "Não aprovado",
  expelled: "Conta suspensa",
  archived: "Conta arquivada",
  approved: "Aprovado",
  app_banned: "Acesso bloqueado",
};

interface Props {
  status: string;
  reason?: string;
}

export function BlockedStatusScreen({ status, reason }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_approval;
  const message =
    status === "app_banned" && reason
      ? `${config.message}\n\nMotivo: ${reason}`
      : config.message;

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status atual</Text>
          <Text style={styles.statusValue}>{STATUS_LABELS[status] ?? status}</Text>
        </View>

        <View style={styles.footer}>
          <Button
            label="Voltar ao login"
            variant="outline"
            onPress={() => signOut(auth)}
          />
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(198,163,78,0.3)",
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  statusCard: {
    backgroundColor: "rgba(198,163,78,0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.2)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: typography.fontBodySemiBold,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.primary,
  },
  footer: {
    width: "100%",
  },
});
