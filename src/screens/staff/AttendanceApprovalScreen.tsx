import React, { useState, useCallback, useMemo } from "react";
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
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { FilterPanel } from "../../components/staff/FilterPanel";
import { ConfirmationModal } from "../../components/timeline/ConfirmationModal";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { useClasses } from "../../hooks/useClasses";

/* ── Types ─────────────────────────────────────────────────────── */

interface AttendanceStudent {
  userId: string;
  name: string;
  nickname?: string;
  photoUrl?: string | null;
  age?: number | null;
  ageCategory?: string | null;
  status: "registered" | "absent" | "confirmed";
  source?: "qr" | "manual";
  attendanceId?: string;
}

interface AttendanceDashboard {
  aulaId: string | null;
  date: string;
  students: AttendanceStudent[];
}

type ScreenState = "idle" | "loading" | "loaded" | "error";

interface ConfirmState {
  student: AttendanceStudent;
  action: "confirm" | "absent";
}

/* ── Ordering ───────────────────────────────────────────────────── */

const ORDER: Record<AttendanceStudent["status"], number> = {
  registered: 0,
  absent: 1,
  confirmed: 2,
};

/* ── Date formatter ─────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ── Props ──────────────────────────────────────────────────────── */

interface AttendanceApprovalScreenProps {
  onBack: () => void;
}

/* ── Component ─────────────────────────────────────────────────── */

export function AttendanceApprovalScreen({ onBack }: AttendanceApprovalScreenProps) {
  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AttendanceDashboard | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Filter local state (within panel)
  const [selectedModalityId, setSelectedModalityId] = useState<string | null>(null);

  const { classes } = useClasses();

  /* ── Derived data ── */

  const modalities = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const c of classes) {
      if (c.modalityId && !seen.has(c.modalityId)) {
        seen.add(c.modalityId);
        result.push({ id: c.modalityId, name: c.modality });
      }
    }
    return result;
  }, [classes]);

  const filteredClasses = selectedModalityId
    ? classes.filter((c) => c.modalityId === selectedModalityId)
    : classes;

  const sorted = [...(dashboard?.students ?? [])].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name),
  );

  /* ── Fetch ── */

  const loadDashboard = useCallback(async (classId: string) => {
    setScreenState("loading");
    try {
      const data = await api.get<AttendanceDashboard>(
        `/attendance/dashboard/${encodeURIComponent(classId)}`,
      );
      setDashboard(data);
      setScreenState("loaded");
    } catch {
      setScreenState("error");
    }
  }, []);

  function onSelectClass(classId: string) {
    setSelectedClassId(classId);
    setFilterVisible(false);
    void loadDashboard(classId);
  }

  /* ── Actions ── */

  async function postAction(path: string, body: object) {
    return api.post(path, body);
  }

  async function runAttendance(student: AttendanceStudent, action: "confirm" | "absent") {
    if (!dashboard || !selectedClassId) return;
    const base = { classId: selectedClassId, userId: student.userId, aulaId: dashboard.aulaId };
    const path = action === "confirm" ? "/attendance/confirm" : "/attendance/reject";
    const body =
      action === "confirm"
        ? { ...base, source: "manual", force: false }
        : { ...base, force: false };
    setActionLoading(student.userId);
    try {
      await postAction(path, body);
      await loadDashboard(selectedClassId);
      setActionLoading(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao registrar.";
      if (message.includes("Sem aula")) {
        // Keep actionLoading set — cleared by Alert callback
        Alert.alert("Sem aula hoje", "Registrar presença fora do dia agendado?", [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => setActionLoading(null),
          },
          {
            text: "Registrar mesmo assim",
            onPress: async () => {
              try {
                await postAction(path, { ...body, force: true });
                await loadDashboard(selectedClassId);
              } catch (e) {
                Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao registrar.");
              } finally {
                setActionLoading(null);
              }
            },
          },
        ]);
      } else {
        Alert.alert("Erro", message);
        setActionLoading(null);
      }
    }
  }

  async function undo(student: AttendanceStudent) {
    if (!student.attendanceId || !selectedClassId) return;
    setActionLoading(student.userId);
    try {
      await api.post(`/attendance/${encodeURIComponent(student.attendanceId)}/undo-validation`, {});
      await loadDashboard(selectedClassId);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao desfazer.");
    } finally {
      setActionLoading(null);
    }
  }

  function openConfirm(student: AttendanceStudent, action: "confirm" | "absent") {
    setConfirmState({ student, action });
  }

  function handleConfirmAction() {
    if (!confirmState) return;
    const { student, action } = confirmState;
    setConfirmState(null);
    void runAttendance(student, action);
  }

  /* ── Render helpers ── */

  function renderStatusBadge(status: AttendanceStudent["status"]) {
    const config =
      status === "registered"
        ? { label: "Aguardando", color: colors.warning, bg: "rgba(245,158,11,0.1)" }
        : status === "confirmed"
          ? { label: "Confirmado", color: colors.success, bg: "rgba(76,175,80,0.1)" }
          : { label: "Sem check-in", color: colors.mutedForeground, bg: "rgba(153,153,153,0.1)" };
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  function renderCard(student: AttendanceStudent) {
    const displayName = student.nickname ?? student.name;
    const age = student.age != null ? `${student.age} anos` : null;
    const isActing = actionLoading === student.userId;
    const busy = actionLoading !== null;

    return (
      <View key={student.userId} style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <UserAvatar name={student.name} photoUrl={student.photoUrl} size={40} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{displayName}</Text>
            {student.nickname && student.nickname !== student.name && (
              <Text style={styles.cardSubName}>{student.name}</Text>
            )}
            <View style={styles.cardMetaRow}>
              {age !== null && <Text style={styles.cardMeta}>{age}</Text>}
              {student.ageCategory ? (
                <>
                  {age !== null && <Text style={styles.cardMetaSep}>·</Text>}
                  <Text style={styles.cardMeta}>{student.ageCategory}</Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={styles.badgeCol}>
            {renderStatusBadge(student.status)}
            {student.source === "qr" && (
              <View style={styles.sourceBadge}>
                <Feather name="grid" size={10} color={colors.primary} />
                <Text style={styles.sourceBadgeText}>QR</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {student.status === "registered" && (
            <>
              <Button
                label="Aprovar"
                variant="primary"
                loading={isActing}
                disabled={busy}
                onPress={() => openConfirm(student, "confirm")}
                style={styles.actionBtn}
              />
              <Button
                label="Rejeitar"
                variant="outline"
                loading={false}
                disabled={busy}
                onPress={() => openConfirm(student, "absent")}
                style={[styles.actionBtn, styles.rejectBtn]}
                textStyle={styles.rejectBtnText}
              />
            </>
          )}

          {student.status === "absent" && (
            <Button
              label="Registrar"
              variant="primary"
              loading={isActing}
              disabled={busy}
              onPress={() => openConfirm(student, "confirm")}
              style={[styles.actionBtn, styles.fullBtn]}
            />
          )}

          {student.status === "confirmed" && (
            <View style={styles.confirmedRow}>
              <View style={styles.confirmedLabel}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={styles.confirmedText}>Confirmado</Text>
              </View>
              <Button
                label="Desfazer"
                variant="outline"
                loading={isActing}
                disabled={busy}
                onPress={() => {
                  Alert.alert(
                    "Desfazer confirmação",
                    `Desfazer a presença confirmada de ${displayName}?`,
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Desfazer",
                        style: "destructive",
                        onPress: () => { void undo(student); },
                      },
                    ],
                  );
                }}
                style={styles.undoBtn}
              />
            </View>
          )}
        </View>
      </View>
    );
  }

  /* ── Filter panel content ── */

  function renderFilterContent() {
    return (
      <>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Modalidade</Text>
          <View style={styles.chipRow}>
            {modalities.map((mod) => {
              const active = selectedModalityId === mod.id;
              return (
                <TouchableOpacity
                  key={mod.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setSelectedModalityId(active ? null : mod.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {mod.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Turma</Text>
          <View style={styles.chipRow}>
            {filteredClasses.map((cls) => {
              const active = selectedClassId === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onSelectClass(cls.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {cls.name}
                  </Text>
                  <Text style={[styles.chipSubText, active && styles.chipTextActive]}>
                    {cls.schedule}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {filteredClasses.length === 0 && (
              <Text style={styles.filterEmpty}>
                {selectedModalityId
                  ? "Nenhuma turma nesta modalidade."
                  : "Nenhuma turma disponível."}
              </Text>
            )}
          </View>
        </View>
      </>
    );
  }

  /* ── States ── */

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frequência</Text>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          hitSlop={8}
          style={styles.filterBtn}
        >
          <Feather name="sliders" size={22} color={colors.foreground} />
          {selectedClassId !== null && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Body */}
      {screenState === "idle" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="users" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Selecione uma turma</Text>
          <Text style={styles.emptyMsg}>
            Escolha uma turma para ver e aprovar a frequência de hoje.
          </Text>
          <View style={styles.idleAction}>
            <Button
              label="Selecionar turma"
              onPress={() => setFilterVisible(true)}
            />
          </View>
        </View>
      )}

      {screenState === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {screenState === "error" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={28} color={colors.error} />
          </View>
          <Text style={styles.emptyTitle}>Falha ao carregar</Text>
          <Text style={styles.emptyMsg}>
            Não foi possível buscar a frequência da turma.
          </Text>
          <View style={styles.idleAction}>
            <Button
              label="Tentar novamente"
              onPress={() => {
                if (selectedClassId) void loadDashboard(selectedClassId);
              }}
            />
          </View>
        </View>
      )}

      {screenState === "loaded" && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Context bar */}
          <View style={styles.contextBar}>
            {selectedClass && (
              <Text style={styles.contextClass}>
                {selectedClass.name}
                {selectedClass.modality ? ` · ${selectedClass.modality}` : ""}
              </Text>
            )}
            {dashboard?.date && (
              <Text style={styles.contextDate}>{formatDate(dashboard.date)}</Text>
            )}
          </View>

          {sorted.length === 0 ? (
            <View style={styles.inlineEmpty}>
              <Feather name="users" size={22} color={colors.mutedForeground} />
              <Text style={styles.inlineEmptyText}>
                Nenhum aluno matriculado nesta turma.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.countLabel}>
                {sorted.length} aluno{sorted.length !== 1 ? "s" : ""}
              </Text>
              {sorted.map(renderCard)}
            </>
          )}
        </ScrollView>
      )}

      {/* Filter panel */}
      <FilterPanel
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Selecionar turma"
      >
        {renderFilterContent()}
      </FilterPanel>

      {/* Confirmation modal */}
      {confirmState !== null && (
        <ConfirmationModal
          visible
          action={confirmState.action}
          entityLabel="presença"
          targetName={confirmState.student.nickname ?? confirmState.student.name}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </SafeAreaView>
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

  // Header
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
  filterBtn: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  filterDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Scroll
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },

  // Context bar
  contextBar: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  contextClass: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  contextDate: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    textTransform: "capitalize",
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
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  cardName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
  },
  cardSubName: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  cardMetaSep: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  badgeCol: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    fontFamily: typography.fontBodyMedium,
    fontSize: 11,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 10,
  },

  // Card actions
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  fullBtn: {
    flex: 1,
    height: 44,
  },
  rejectBtn: {
    borderColor: colors.error,
  },
  rejectBtnText: {
    color: colors.error,
  },
  confirmedRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confirmedLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  confirmedText: {
    color: colors.success,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  undoBtn: {
    height: 36,
    paddingHorizontal: spacing.md,
  },

  // Empty / error
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
  idleAction: {
    width: "100%",
    marginTop: spacing.xl,
  },
  inlineEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    justifyContent: "center",
  },
  inlineEmptyText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
  },

  // Filter panel content
  filterSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterSectionTitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 2,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  chipTextActive: {
    color: colors.primary,
  },
  chipSubText: {
    fontSize: 11,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
  },
  filterEmpty: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
});
