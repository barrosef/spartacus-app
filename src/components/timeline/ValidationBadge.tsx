import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import type { ValidationStatus } from "./types";

interface ValidationBadgeProps {
  status: ValidationStatus;
  reviewRequested: boolean;
  reviewResolved: boolean;
}

interface BadgeConfig {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

function getBadgeConfig(
  status: ValidationStatus,
  reviewRequested: boolean,
  reviewResolved: boolean,
): BadgeConfig | null {
  if (status === "pending") {
    return {
      backgroundColor: "rgba(245,158,11,0.12)",
      borderColor: "rgba(245,158,11,0.25)",
      textColor: colors.warning,
      iconColor: colors.warning,
      icon: "clock",
      label: "Aguardando validacao",
    };
  }

  if (status === "confirmed") {
    return {
      backgroundColor: "rgba(76,175,80,0.12)",
      borderColor: "rgba(76,175,80,0.25)",
      textColor: colors.success,
      iconColor: colors.success,
      icon: "check-circle",
      label: "Validado",
    };
  }

  if (status === "absent") {
    if (reviewRequested && !reviewResolved) {
      return {
        backgroundColor: "rgba(239,68,68,0.12)",
        borderColor: "rgba(239,68,68,0.25)",
        textColor: colors.error,
        iconColor: colors.error,
        icon: "alert-circle",
        label: "Revisao solicitada",
      };
    }

    return {
      backgroundColor: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.25)",
      textColor: colors.error,
      iconColor: colors.error,
      icon: "x-circle",
      label: "Nao confirmado",
    };
  }

  return null;
}

export function ValidationBadge({
  status,
  reviewRequested,
  reviewResolved,
}: ValidationBadgeProps) {
  const config = getBadgeConfig(status, reviewRequested, reviewResolved);

  if (!config) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Feather name={config.icon} size={14} color={config.iconColor} />
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: typography.fontBodyMedium,
  },
});
