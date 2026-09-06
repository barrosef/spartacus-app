import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor",
  instructor: "Instrutor",
  guardian: "Responsável",
  supporter: "Apoiador",
  sponsor: "Patrocinador",
  owner: "Controlador",
  assistant: "Assistente",
};

interface RolesScreenProps {
  onBack: () => void;
}

export function RolesScreen({ onBack }: RolesScreenProps) {
  const { actingAs } = useProxy();
  const [roles, setRoles] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<{ roles: string[] }>(
        "/users/me/profile",
        { headers },
      );
      setRoles(data.roles);
    } catch {
      // graceful
    }
  }, [actingAs]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={24}
          color={colors.foreground}
          onPress={onBack}
        />
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>
          Seus perfis ativos neste projeto:
        </Text>

        <View style={styles.chips}>
          {roles.map((role) => (
            <View key={role} style={styles.chip}>
              <Text style={styles.chipText}>
                {ROLE_LABELS[role] ?? role}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Os perfis são definidos pela equipe do projeto. Para
          alterações, entre em contato com a secretaria.
        </Text>
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
    fontSize: 17,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  label: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: "rgba(198,163,78,0.1)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  hint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    lineHeight: 20,
  },
});
