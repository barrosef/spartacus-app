import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

interface YesNoToggleProps {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  error?: string;
}

export function YesNoToggle({ label, value, onChange, error }: YesNoToggleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.option, value === true && styles.optionActive]}
          onPress={() => onChange(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.text, value === true && styles.textActive]}>
            Sim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, value === false && styles.optionActive]}
          onPress={() => onChange(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.text, value === false && styles.textActive]}>
            Não
          </Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  text: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  textActive: {
    color: colors.primary,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
    fontFamily: typography.fontBody,
  },
});
