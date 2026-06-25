import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import type { AnamneseStatus } from "../../hooks/useAnamneseStatus";

interface AnamneseReminderBannerProps {
  roles: string[];
  anamneseStatus: AnamneseStatus;
  onPress: () => void;
}

/**
 * Non-blocking reminder banner for students who haven't submitted (or need
 * revision of) their health form (anamnese).
 *
 * Renders null when:
 * - the user is not a student, OR
 * - status is "pending_approval" or "approved" (no action needed)
 */
export function AnamneseReminderBanner({
  roles,
  anamneseStatus,
  onPress,
}: AnamneseReminderBannerProps) {
  if (!roles.includes("student")) return null;
  if (anamneseStatus === "pending_approval" || anamneseStatus === "approved") {
    return null;
  }

  const isRevision = anamneseStatus === "needs_revision";

  return (
    <TouchableOpacity
      style={[styles.card, isRevision ? styles.cardRevision : styles.cardDefault]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={
        isRevision
          ? "Sua ficha de saúde precisa de ajustes. Toque para editar."
          : "Preencha sua ficha de saúde. Toque para acessar."
      }
    >
      <Feather
        name={isRevision ? "alert-circle" : "heart"}
        size={18}
        color={isRevision ? colors.error : colors.primary}
        style={styles.icon}
      />
      <View style={styles.textWrap}>
        <Text style={[styles.title, isRevision ? styles.titleRevision : styles.titleDefault]}>
          {isRevision
            ? "Sua ficha de saúde precisa de ajustes"
            : "Preencha sua ficha de saúde"}
        </Text>
        <Text style={styles.subtitle}>
          {isRevision
            ? "O assistente solicitou uma revisão. Toque para editar e reenviar."
            : "Mantenha seu histórico de saúde atualizado."}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  cardDefault: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  cardRevision: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.25)",
  },
  icon: {
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  titleDefault: {
    color: colors.primary,
  },
  titleRevision: {
    color: colors.error,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 17,
  },
});
