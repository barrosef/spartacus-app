import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

type Frequency = "always" | "sometimes" | "never" | "";

interface SymptomRowProps {
  label: string;
  value: Frequency;
  onChange: (v: Frequency) => void;
}

const OPTIONS: { value: Frequency; label: string }[] = [
  { value: "always", label: "Sempre" },
  { value: "sometimes", label: "Às vezes" },
  { value: "never", label: "Nunca" },
];

export function SymptomRow({ label, value, onChange }: SymptomRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => onChange(opt.value as Frequency)}
              activeOpacity={0.8}
            >
              <Text style={[styles.text, active && styles.textActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
    color: colors.foreground,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  text: {
    fontSize: 12,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  textActive: {
    color: colors.primary,
  },
});
