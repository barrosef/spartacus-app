import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";

type Variant = "success" | "warning" | "error";

const VARIANT_CONFIG: Record<Variant, { icon: keyof typeof Feather.glyphMap; color: string; glow: string }> = {
  success: { icon: "check", color: colors.success, glow: "rgba(76,175,80,0.15)" },
  warning: { icon: "alert-triangle", color: colors.warning, glow: "rgba(245,158,11,0.15)" },
  error: { icon: "x", color: colors.error, glow: "rgba(239,68,68,0.15)" },
};

interface SuccessScreenProps {
  variant?: Variant;
  title: string;
  message?: string;
  /** Auto-dismiss after ms. Only for success variant. 0 = no auto-dismiss. */
  autoDismissMs?: number;
  onDismiss?: () => void;
}

export function SuccessScreen({
  variant = "success",
  title,
  message,
  autoDismissMs = 2000,
  onDismiss,
}: SuccessScreenProps) {
  const config = VARIANT_CONFIG[variant];
  const shouldAutoDismiss = variant === "success" && autoDismissMs > 0 && onDismiss;

  useEffect(() => {
    if (!shouldAutoDismiss) return;
    const timer = setTimeout(() => onDismiss!(), autoDismissMs);
    return () => clearTimeout(timer);
  }, [shouldAutoDismiss, autoDismissMs, onDismiss]);

  return (
    <View style={styles.container}>
      <View style={[styles.iconOuter, { shadowColor: config.color, backgroundColor: config.glow }]}>
        <View style={[styles.iconInner, { borderColor: config.color }]}>
          <Feather name={config.icon} size={28} color={config.color} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
  },
  iconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 22,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
});
