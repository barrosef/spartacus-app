import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ── Types ─────────────────────────────────────────────────────── */

interface AttendanceRecord {
  id: string;
  date: string;
  dateSort: string;
  modalityName: string;
  status: "registered" | "confirmed" | "absent" | "absent_justified";
  statusLabel: string;
  justification?: string | null;
}

interface MonthSummary {
  month: string;
  monthLabel: string;
  attended: number;
  total: number;
  percent: number;
  records: AttendanceRecord[];
}

interface AttendanceHistory {
  streakDays: number;
  overallPercent: number;
  months: MonthSummary[];
}

type FilterTab = "all" | "confirmed" | "absent";
type Screen = "loading" | "loaded" | "empty";

/* ── Status config ─────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  registered: { bg: "rgba(245,158,11,0.15)", text: colors.warning },
  confirmed: { bg: "rgba(76,175,80,0.15)", text: colors.success },
  absent: { bg: "rgba(239,68,68,0.15)", text: colors.error },
  absent_justified: { bg: "rgba(100,149,237,0.15)", text: "#6495ED" },
};

const STATUS_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  registered: "clock",
  confirmed: "check-circle",
  absent: "x-circle",
  absent_justified: "alert-circle",
};

/* ── Component ─────────────────────────────────────────────────── */

interface FrequencyHistoryScreenProps {
  onBack: () => void;
}

export function FrequencyHistoryScreen({ onBack }: FrequencyHistoryScreenProps) {
  const { actingAs } = useProxy();
  const [screen, setScreen] = useState<Screen>("loading");
  const [data, setData] = useState<AttendanceHistory | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setScreen("loading");
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const res = await api.get<AttendanceHistory>(
        "/attendance/history",
        { headers },
      );
      setData(res);
      setScreen(res.months.length > 0 ? "loaded" : "empty");
    } catch {
      setScreen("empty");
    }
  }, [actingAs]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const toggleMonth = (month: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  const filterRecords = (records: AttendanceRecord[]): AttendanceRecord[] => {
    if (filter === "all") return records;
    if (filter === "confirmed") {
      return records.filter((r) => r.status === "confirmed" || r.status === "registered");
    }
    return records.filter((r) => r.status === "absent" || r.status === "absent_justified");
  };

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
  if (screen === "empty" || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum registro</Text>
          <Text style={styles.emptyMsg}>
            Seus dados de frequência aparecerão aqui após o primeiro check-in.
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
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
            <Feather name="zap" size={24} color="#F97316" />
            <Text style={styles.summaryNumber}>{data.streakDays}</Text>
            <Text style={styles.summaryLabel}>Dias Seguidos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Feather name="award" size={24} color={colors.primary} />
            <Text style={styles.summaryNumber}>{data.overallPercent}%</Text>
            <Text style={styles.summaryLabel}>Média Geral</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.tabRow}>
          {(["all", "confirmed", "absent"] as FilterTab[]).map((tab) => {
            const active = filter === tab;
            const label = tab === "all"
              ? "Todos"
              : tab === "confirmed"
                ? "Presenças"
                : "Faltas";
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

        {/* Section title */}
        <Text style={styles.sectionTitle}>HISTÓRICO MENSAL</Text>

        {/* Month cards */}
        {data.months.map((m) => {
          const isExpanded = expandedMonth === m.month;
          const filtered = filterRecords(m.records);
          const progressColor =
            m.percent >= 80 ? colors.success
              : m.percent >= 50 ? colors.primary
                : colors.warning;

          return (
            <View key={m.month} style={styles.monthCard}>
              {/* Month header — tappable */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleMonth(m.month)}
              >
                <View style={styles.monthHeader}>
                  <View style={styles.monthHeaderLeft}>
                    <Text style={styles.monthLabel}>{m.monthLabel}</Text>
                    <View style={styles.monthSubRow}>
                      <Feather
                        name="check-square"
                        size={13}
                        color={colors.mutedForeground}
                      />
                      <Text style={styles.monthSubText}>
                        {m.attended} de {m.total} treinos realizados
                      </Text>
                    </View>
                  </View>
                  <View style={styles.monthHeaderRight}>
                    <Text style={[styles.monthPercent, { color: progressColor }]}>
                      {m.percent}%
                    </Text>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(m.percent, 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded: individual records */}
              {isExpanded && filtered.length > 0 && (
                <View style={styles.recordList}>
                  {filtered.map((r) => {
                    const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.absent;
                    const icon = STATUS_ICONS[r.status] ?? "x-circle";
                    return (
                      <View key={r.id} style={styles.recordCard}>
                        <View style={styles.recordLeft}>
                          <Text style={styles.recordDate}>{r.date}</Text>
                          <Text style={styles.recordModality}>
                            {r.modalityName}
                          </Text>
                        </View>
                        <View style={styles.recordRight}>
                          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                            <Feather name={icon} size={12} color={sc.text} />
                            <Text style={[styles.badgeText, { color: sc.text }]}>
                              {r.statusLabel}
                            </Text>
                          </View>
                          {r.justification && (
                            <Text style={styles.justification}>
                              {r.justification}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {isExpanded && filtered.length === 0 && (
                <Text style={styles.noRecords}>
                  Nenhum registro para este filtro.
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Header component ──────────────────────────────────────────── */

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Feather
        name="chevron-left"
        size={24}
        color={colors.foreground}
        onPress={onBack}
      />
      <Text style={styles.headerTitle}>Frequência</Text>
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
    paddingBottom: spacing.xxl,
  },

  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 4,
    gap: spacing.xs,
  },
  summaryCardHighlight: {
    borderColor: "rgba(198,163,78,0.3)",
  },
  summaryNumber: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 28,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },

  // Filter tabs
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
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

  // Section title
  sectionTitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: spacing.sm + 4,
  },

  // Month cards
  monthCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  monthHeaderLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  monthHeaderRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  monthLabel: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  monthSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  monthSubText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  monthPercent: {
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },

  // Progress bar
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },

  // Individual records
  recordList: {
    marginTop: spacing.sm + 4,
    gap: spacing.sm,
  },
  recordCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
  },
  recordLeft: {
    flex: 1,
    gap: 2,
  },
  recordDate: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  recordModality: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  recordRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
  },
  justification: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
    fontStyle: "italic",
  },
  noRecords: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.md,
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
