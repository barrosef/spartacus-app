import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

interface CompletionBarProps {
  percent: number;
}

export function CompletionBar({ percent }: CompletionBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Cadastro</Text>
        <Text style={styles.pct}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs + 2,
  },
  label: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  pct: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
