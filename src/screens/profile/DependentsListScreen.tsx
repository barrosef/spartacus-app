import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";

interface DependentData {
  uid: string;
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  classNames?: string[];
  approvalStatus?: string;
}

interface DependentsListScreenProps {
  onBack: () => void;
  onSelectDependent?: (uid: string, name: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function calcAge(bd: string): number | null {
  try {
    const [d, m, y] = bd.split("/").map(Number);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

function genderLabel(g?: string | null): string {
  if (g === "male") return "Masculino";
  if (g === "female") return "Feminino";
  return "—";
}

function avatarColor(name: string): string {
  const palette = [
    "#C6A34E",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function DependentsListScreen({
  onBack,
  onSelectDependent,
}: DependentsListScreenProps) {
  const [deps, setDeps] = useState<DependentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDependents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<DependentData[]>("/users/me/dependents");
      setDeps(data);
    } catch {
      setDeps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDependents();
  }, [fetchDependents]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dependentes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : deps.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Sem dependentes</Text>
          <Text style={styles.emptyMessage}>
            Você ainda não cadastrou nenhum dependente.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            {deps.length}{" "}
            {deps.length === 1 ? "dependente cadastrado" : "dependentes cadastrados"}
          </Text>

          {deps.map((dep) => {
            const age = dep.birthDate ? calcAge(dep.birthDate) : null;
            const bg = avatarColor(dep.name);
            return (
              <TouchableOpacity
                key={dep.uid}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  onSelectDependent?.(dep.uid, dep.name)
                }
              >
                {/* Header: avatar + name + age */}
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: bg }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(dep.name)}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {dep.name}
                    </Text>
                    {age !== null && (
                      <Text style={styles.subtitle}>
                        {age} {age === 1 ? "ano" : "anos"}
                      </Text>
                    )}
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={colors.mutedForeground}
                  />
                </View>

                {/* Info rows */}
                <View style={styles.infoGrid}>
                  <InfoRow
                    icon="calendar"
                    label="Nascimento"
                    value={dep.birthDate ?? "—"}
                  />
                  <InfoRow
                    icon="user"
                    label="Gênero"
                    value={genderLabel(dep.gender)}
                  />
                </View>

                {/* Modalities */}
                {dep.classNames && dep.classNames.length > 0 && (
                  <View style={styles.modalitiesSection}>
                    <Text style={styles.modalitiesLabel}>Modalidades</Text>
                    <View style={styles.chipsRow}>
                      {dep.classNames.map((cn, i) => (
                        <View key={`${cn}-${i}`} style={styles.chip}>
                          <Feather
                            name="award"
                            size={11}
                            color={colors.primary}
                          />
                          <Text style={styles.chipText}>{cn}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  headerSpacer: { width: 24 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(153,153,153,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  emptyMessage: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  infoRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
    marginTop: 1,
  },
  modalitiesSection: {
    gap: spacing.xs,
  },
  modalitiesLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.3)",
  },
  chipText: {
    color: colors.primary,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },
});
