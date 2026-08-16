import React from "react";
import { View, StyleSheet, ScrollView, type ScrollViewProps } from "react-native";
// SafeAreaView vem do safe-area-context (não do react-native): o do core é
// iOS-only e ignora os insets no Android — com o edge-to-edge obrigatório da
// API 36 isso deixaria conteúdo atrás das barras de status e de navegação.
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, spacing } from "../../theme/tokens";

interface SafeScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
  noPadding?: boolean;
  edges?: readonly Edge[];
}

export function SafeScreen({
  children,
  scrollable = false,
  scrollProps,
  noPadding = false,
  edges = ["top", "bottom"],
}: SafeScreenProps) {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, noPadding && styles.noPadding]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, noPadding && styles.noPadding]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
});
