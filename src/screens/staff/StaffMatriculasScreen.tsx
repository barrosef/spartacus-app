import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";

/* ── Types ─────────────────────────────────────────────────────── */

interface AccountOut {
  uid: string;
  name: string;
  nickname?: string;
  roles: string[];
  status: string;
  birthDate?: string;
  photoUrl?: string;
  guardianName?: string;
  availableActions?: { action: string; label: string }[];
}

interface AccountListPage {
  items: AccountOut[];
  total: number;
}

type ScreenState = "loading" | "loaded" | "empty" | "error";

/* ── Role labels ────────────────────────────────────────────────── */

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

function formatRoles(roles: string[]): string {
  if (roles.length === 0) return "—";
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
}

/* ── Age helper ─────────────────────────────────────────────────── */

function computeAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  // Expect ISO date string like "2010-05-12" or "2010-05-12T00:00:00"
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return birthDate; // fallback: return raw string
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return `${age} anos`;
}

/* ── Props ──────────────────────────────────────────────────────── */

interface StaffMatriculasScreenProps {
  onBack: () => void;
  userRoles: string[];
}

/* ── Component ─────────────────────────────────────────────────── */

export function StaffMatriculasScreen({
  onBack,
  userRoles,
}: StaffMatriculasScreenProps) {
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canAct = userRoles.includes("owner") || userRoles.includes("assistant");

  const fetchPending = useCallback(async () => {
    setScreenState("loading");
    try {
      const res = await api.get<AccountListPage>(
        "/accounts?status=pending_approval&pageSize=50",
      );
      setAccounts(res.items);
      setScreenState(res.items.length > 0 ? "loaded" : "empty");
    } catch {
      setScreenState("error");
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = useCallback(async (uid: string) => {
    setActionLoading(uid);
    try {
      await api.post(`/accounts/${uid}/transitions`, { action: "approve" });
      setAccounts((prev) => prev.filter((a) => a.uid !== uid));
      setScreenState((prev) => {
        const remaining = accounts.filter((a) => a.uid !== uid);
        return remaining.length === 0 ? "empty" : prev;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao aprovar conta.";
      Alert.alert("Erro", message);
    } finally {
      setActionLoading(null);
    }
  }, [accounts]);

  const handleReject = useCallback((uid: string, name: string) => {
    Alert.alert(
      "Recusar matrícula",
      `Tem certeza que deseja recusar a matrícula de ${name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recusar",
          style: "destructive",
          onPress: async () => {
            setActionLoading(uid);
            try {
              await api.post(`/accounts/${uid}/transitions`, { action: "reject" });
              setAccounts((prev) => prev.filter((a) => a.uid !== uid));
              setScreenState((prev) => {
                const remaining = accounts.filter((a) => a.uid !== uid);
                return remaining.length === 0 ? "empty" : prev;
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Erro ao recusar conta.";
              Alert.alert("Erro", message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [accounts]);

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
            Não foi possível buscar as matrículas pendentes.
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
            <Feather name="check-circle" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma matrícula pendente</Text>
          <Text style={styles.emptyMsg}>
            Todas as solicitações foram processadas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Loaded ── */
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader onBack={onBack} />

      {!canAct && (
        <View style={styles.readOnlyBanner}>
          <Feather name="info" size={14} color={colors.warning} />
          <Text style={styles.readOnlyText}>
            Apenas controlador/assistente pode aprovar matrículas.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.countLabel}>
          {accounts.length} solicitação{accounts.length !== 1 ? "ões" : ""} pendente{accounts.length !== 1 ? "s" : ""}
        </Text>

        {accounts.map((account) => {
          const displayName = account.nickname ?? account.name;
          const age = computeAge(account.birthDate);
          const isActing = actionLoading === account.uid;

          return (
            <View key={account.uid} style={styles.card}>
              {/* Name row */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{displayName}</Text>
                  {account.nickname && account.nickname !== account.name && (
                    <Text style={styles.cardSubName}>{account.name}</Text>
                  )}
                  {account.guardianName && (
                    <Text style={styles.cardMeta}>
                      Responsável: {account.guardianName}
                    </Text>
                  )}
                </View>
              </View>

              {/* Role + age row */}
              <View style={styles.cardBadgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {formatRoles(account.roles)}
                  </Text>
                </View>
                {age !== null && (
                  <Text style={styles.ageMeta}>{age}</Text>
                )}
              </View>

              {/* Action buttons */}
              {canAct && (
                <View style={styles.cardActions}>
                  <Button
                    label="Aprovar"
                    variant="primary"
                    loading={isActing}
                    disabled={actionLoading !== null}
                    onPress={() => handleApprove(account.uid)}
                    style={styles.actionBtn}
                  />
                  <Button
                    label="Recusar"
                    variant="outline"
                    loading={false}
                    disabled={actionLoading !== null}
                    onPress={() => handleReject(account.uid, displayName)}
                    style={[styles.actionBtn, styles.rejectBtn]}
                    textStyle={styles.rejectBtnText}
                  />
                </View>
              )}
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
      <Feather
        name="chevron-left"
        size={24}
        color={colors.foreground}
        onPress={onBack}
      />
      <Text style={styles.headerTitle}>Matrículas</Text>
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

  // Read-only banner
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.15)",
  },
  readOnlyText: {
    color: colors.warning,
    fontFamily: typography.fontBody,
    fontSize: 12,
    flex: 1,
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

  // Account card
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

  cardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
  },
  ageMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },

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
