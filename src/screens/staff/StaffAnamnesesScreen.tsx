import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";

interface StaffAnamnesesScreenProps {
  onBack: () => void;
}

export function StaffAnamnesesScreen({ onBack }: StaffAnamnesesScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anamneses</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.center}>
        <Text style={styles.placeholder}>Em breve</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  headerSpacer: {
    width: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 16,
  },
});
