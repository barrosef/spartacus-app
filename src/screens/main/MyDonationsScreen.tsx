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
import { useProxy } from "../../context/ProxyContext";
import { Button } from "../../components/ui/Button";

/* ── Types ─────────────────────────────────────────────────────── */

interface DonationHistoryItem {
  id: string;
  month: string;
  monthLabel: string;
  itemLabel: string;
  status: string;       // "pledged" | "received" | "pending"
  statusLabel: string;
  createdAt: string;
}

interface DonationHistory {
  donations: DonationHistoryItem[];
}

type FilterTab = "all" | "received" | "pending";
type Screen = "loading" | "loaded" | "empty";

/* ── Status styling ────────────────────────────────────────────── */

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  received: { bg: "rgba(76,175,80,0.15)", text: colors.success },
  pledged: { bg: "rgba(245,158,11,0.15)", text: colors.warning },
  pending: { bg: "rgba(245,158,11,0.15)", text: colors.warning },
};

/* ── Component ─────────────────────────────────────────────────── */

interface MyDonationsScreenProps {
  onBack: () => void;
  onNewDonation: () => void;
}

export function MyDonationsScreen({
  onBack,
  onNewDonation,
}: MyDonationsScreenProps) {
  const { actingAs } = useProxy();
  const [screen, setScreen] = useState<Screen>("loading");
  const [donations, setDonations] = useState<DonationHistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchHistory = useCallback(async () => {
    setScreen("loading");
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const res = await api.get<DonationHistory>(
        "/donations/history",
        { headers },
      );
      setDonations(res.donations);
      setScreen(res.donations.length > 0 ? "loaded" : "empty");
    } catch {
      setScreen("empty");
    }
  }, [actingAs]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = donations.filter((d) => {
    if (filter === "all") return true;
    if (filter === "received") return d.status === "received";
    // "pending" tab shows both pledged and pending (no donation)
    return d.status === "pledged" || d.status === "pending";
  });

  /* ── Loading ── */
  if (screen === "loading") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Empty ── */
  if (screen === "empty") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="heart" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma doação</Text>
          <Text style={styles.emptyMsg}>
            Suas doações aparecerão aqui após o primeiro registro.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button label="Fazer Nova Doação" onPress={onNewDonation} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Loaded ── */
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader onBack={onBack} />

      {/* Filter tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {(["all", "received", "pending"] as FilterTab[]).map((tab) => {
            const active = filter === tab;
            const label = tab === "all"
              ? "Todos"
              : tab === "received"
                ? "Entregues"
                : "Pendentes";
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                activeOpacity={0.7}
                onPress={() => setFilter(tab)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((d) => {
          const ss = STATUS_STYLE[d.status] ?? STATUS_STYLE.pending;
          const isPending = d.status === "pending";

          return (
            <View key={d.id} style={styles.donationCard}>
              {/* Month header */}
              <View style={styles.monthRow}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={styles.monthLabel}>{d.monthLabel}</Text>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.statusText, { color: ss.text }]}>
                    {d.statusLabel}
                  </Text>
                </View>
              </View>

              {/* Item or placeholder */}
              {isPending ? (
                <Text style={styles.dateLabelMuted}>
                  {d.createdAt}
                </Text>
              ) : (
                <>
                  <Text style={styles.itemLabel}>{d.itemLabel}</Text>
                  <Text style={styles.dateLabel}>
                    Data do registro: {d.createdAt}
                  </Text>
                </>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <Text style={styles.noResults}>
            Nenhum registro para este filtro.
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Fazer Nova Doação" onPress={onNewDonation} />
      </View>
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
      <Text style={styles.headerTitle}>Minhas Doações</Text>
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

  // Tabs
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.sm,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
  },

  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Donation card
  donationCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  monthLabel: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 14,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
  },
  itemLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
  },
  dateLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  dateLabelMuted: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontStyle: "italic",
  },
  noResults: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xl,
  },

  // Empty state
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
  },
  emptyMsg: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
