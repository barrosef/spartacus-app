import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";
import { useProxy } from "../../context/ProxyContext";

export function ProxyBanner() {
  const { actingAs, actingAsName, clearProxy } = useProxy();

  if (!actingAs) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Navegando como{" "}
        <Text style={styles.name}>{actingAsName}</Text>
      </Text>
      <TouchableOpacity onPress={clearProxy} hitSlop={8}>
        <Feather name="x" size={18} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(198,163,78,0.15)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(198,163,78,0.3)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  text: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  name: {
    fontFamily: typography.fontBodySemiBold,
    color: colors.primary,
  },
});
