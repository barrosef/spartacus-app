import React, { useRef, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

const MONTHS = [
  "jan.", "fev.", "mar.", "abr.", "mai.", "jun.",
  "jul.", "ago.", "set.", "out.", "nov.", "dez.",
];

interface MonthSelectorProps {
  selectedMonth: number; // 0-11
  onSelect: (month: number) => void;
}

export function MonthSelector({ selectedMonth, onSelect }: MonthSelectorProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const offset = Math.max(0, selectedMonth * 64 - 120);
    scrollRef.current?.scrollTo({ x: offset, animated: false });
  }, [selectedMonth]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {MONTHS.map((label, idx) => {
        const active = idx === selectedMonth;
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.pill, active && styles.pillActive]}
            activeOpacity={0.7}
            onPress={() => onSelect(idx)}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: colors.card,
  },
  text: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  textActive: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
  },
});
