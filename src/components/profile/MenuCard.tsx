import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";

interface MenuCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function MenuCard({ icon, title, subtitle, onPress }: MenuCardProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <Feather
        name={icon}
        size={24}
        color={colors.mutedForeground}
        style={styles.icon}
      />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function MenuDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  icon: {
    marginRight: spacing.md,
    width: 24,
  },
  text: {
    flex: 1,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56, // aligns with text, not icon
  },
});
