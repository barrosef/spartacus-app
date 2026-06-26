import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api, getProjectId } from "../../lib/api";
import { Button } from "../../components/ui/Button";

/* ── Types ─────────────────────────────────────────────────────── */

interface ModalityOut {
  id: string;
  name: string;
  slug: string;
}

interface ModalitiesResponse {
  modalities: ModalityOut[];
}

interface NextBelt {
  slug: string;
  name: string;
  color: string;
  maxDegree: number;
}

interface GraduationStudentCard {
  userId: string;
  name: string;
  nickname?: string | null;
  belt?: string | null;
  beltName?: string | null;
  degree: number;
  status: string;
  nextBelt?: NextBelt | null;
}

interface GraduationDashboardOut {
  modalitySlug: string;
  modalityName: string;
  hasSystem: boolean;
  students: GraduationStudentCard[];
}

interface PendingGraduation extends GraduationStudentCard {
  modalitySlug: string;
  modalityName: string;
}

type ScreenState = "loading" | "loaded" | "empty" | "error";

/* ── Props ──────────────────────────────────────────────────────── */

interface StaffGraduacoesScreenProps {
  onBack: () => void;
}

/* ── Component ─────────────────────────────────────────────────── */

export function StaffGraduacoesScreen({ onBack }: StaffGraduacoesScreenProps) {
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [pendingItems, setPendingItems] = useState<PendingGraduation[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setScreenState("loading");
    try {
      const projectId = getProjectId();
      const modalitiesRes = await api.get<ModalitiesResponse>(
        `/projects/${projectId}/modalities`,
      );

      const results = await Promise.all(
        modalitiesRes.modalities.map(async (modality) => {
          try {
            const dashboard = await api.get<GraduationDashboardOut>(
              `/graduations/dashboard?modality=${encodeURIComponent(modality.slug)}`,
            );
            return dashboard.students
              .filter((s) => s.status === "pending")
              .map<PendingGraduation>((s) => ({
                ...s,
                modalitySlug: modality.slug,
                modalityName: dashboard.modalityName,
              }));
          } catch {
            // Non-fatal: modality may lack a graduation system — skip it
            return [];
          }
        }),
      );

      const allPending = results.flat();
      setPendingItems(allPending);
      setScreenState(allPending.length > 0 ? "loaded" : "empty");
    } catch {
      setScreenState("error");
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = useCallback(async (item: PendingGraduation) => {
    const key = `${item.userId}_${item.modalitySlug}`;
    setActionLoading(key);
    try {
      await api.post(`/graduations/${item.userId}/approve`, {
        modality: item.modalitySlug,
      });
      setPendingItems((prev) => {
        const next = prev.filter(
          (i) => !(i.userId === item.userId && i.modalitySlug === item.modalitySlug),
        );
        if (next.length === 0) setScreenState("empty");
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao aprovar graduação.";
      Alert.alert("Erro", message);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleReject = useCallback((item: PendingGraduation) => {
    const displayName = item.nickname ?? item.name;
    Alert.alert(
      "Reprovar graduação",
      `Tem certeza que deseja reprovar a graduação de ${displayName} em ${item.modalityName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reprovar",
          style: "destructive",
          onPress: async () => {
            const key = `${item.userId}_${item.modalitySlug}`;
            setActionLoading(key);
            try {
              await api.post(`/graduations/${item.userId}/reject`, {
                modality: item.modalitySlug,
              });
              setPendingItems((prev) => {
                const next = prev.filter(
                  (i) => !(i.userId === item.userId && i.modalitySlug === item.modalitySlug),
                );
                if (next.length === 0) setScreenState("empty");
                return next;
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Erro ao reprovar graduação.";
              Alert.alert("Erro", message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, []);

  /* ── Loading ── */
  if (screenState === "loading") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Error ── */
  if (screenState === "error") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={28} color={colors.error} />
          </View>
          <Text style={styles.emptyTitle}>Falha ao carregar</Text>
          <Text style={styles.emptyMsg}>
            Não foi possível buscar as graduações pendentes.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button label="Tentar novamente" onPress={fetchPending} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Empty ── */
  if (screenState === "empty") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="award" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma graduação pendente</Text>
          <Text style={styles.emptyMsg}>
            Todas as graduações foram processadas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Loaded ── */
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.countLabel}>
          {pendingItems.length} graduação{pendingItems.length !== 1 ? "ões" : ""} pendente{pendingItems.length !== 1 ? "s" : ""}
        </Text>

        {pendingItems.map((item) => {
          const key = `${item.userId}_${item.modalitySlug}`;
          const displayName = item.nickname ?? item.name;
          const isActing = actionLoading === key;
          const currentBelt = item.beltName ?? item.belt ?? "Sem faixa";
          const nextBelt = item.nextBelt?.name ?? null;

          return (
            <View key={key} style={styles.card}>
              {/* Name row */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Feather name="award" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{displayName}</Text>
                  {item.nickname && item.nickname !== item.name && (
                    <Text style={styles.cardSubName}>{item.name}</Text>
                  )}
                  <Text style={styles.cardMeta}>{item.modalityName}</Text>
                </View>
              </View>

              {/* Belt progression row */}
              <View style={styles.beltRow}>
                <View style={styles.beltBadge}>
                  <Text style={styles.beltBadgeText}>{currentBelt}</Text>
                </View>
                {nextBelt !== null && (
                  <>
                    <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                    <View style={[styles.beltBadge, styles.nextBeltBadge]}>
                      <Text style={[styles.beltBadgeText, styles.nextBeltText]}>
                        {nextBelt}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.cardActions}>
                <Button
                  label="Aprovar"
                  variant="primary"
                  loading={isActing}
                  disabled={actionLoading !== null}
                  onPress={() => handleApprove(item)}
                  style={styles.actionBtn}
                />
                <Button
                  label="Reprovar"
                  variant="outline"
                  loading={false}
                  disabled={actionLoading !== null}
                  onPress={() => handleReject(item)}
                  style={[styles.actionBtn, styles.rejectBtn]}
                  textStyle={styles.rejectBtnText}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Header ────────────────────────────────────────────────────── */

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={8}>
        <Feather name="chevron-left" size={24} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Graduações</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
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

  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  countLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginBottom: spacing.md,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  cardName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  cardSubName: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  cardMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },

  // Belt row
  beltRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  beltBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
  },
  beltBadgeText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
  },
  nextBeltBadge: {
    backgroundColor: "rgba(76,175,80,0.1)",
  },
  nextBeltText: {
    color: colors.success,
  },

  // Actions
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  rejectBtn: {
    borderColor: colors.error,
  },
  rejectBtnText: {
    color: colors.error,
  },

  // Empty/error state
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(153,153,153,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 20,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptyMsg: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
