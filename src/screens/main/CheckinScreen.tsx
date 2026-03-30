import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";

export function CheckinScreen() {
  return (
    <View style={styles.container}>
      <Feather name="check-square" size={48} color={colors.primaryMuted} />
      <Text style={styles.title}>Check-in</Text>
      <Text style={styles.sub}>
        Escaneie o QR Code da aula para registrar presença.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
    marginTop: spacing.sm,
  },
  sub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
  },
});
