import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api, ApiError } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { FilterPanel } from "../../components/ui/FilterPanel";
import { ReasonPrompt } from "../../components/staff/ReasonPrompt";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { SelectBox } from "../../components/ui/SelectBox";
import { useDialog } from "../../components/ui/DialogProvider";
import { useClasses } from "../../hooks/useClasses";
import type { ClassOption } from "../../context/WizardContext";
import { getBeltColor, NO_GRADUATION_COLOR } from "../../lib/belts";
import { AttendanceApprovalScreen } from "./AttendanceApprovalScreen";

/* ── Types (mirror app/models/attendance.py AttendanceAnalyticsOut) ────── */

interface AttendanceCounts {
  confirmed: number;
  absent: number;
  absentJustified: number;
  justificationPending: number;
  awaitingConfirmation: number;
}

interface StudentGraduation {
  belt: string;
  degree: number;
}

interface AnalyticsStudent {
  userId: string;
  name: string;
  photoUrl?: string | null;
  graduation?: StudentGraduation | null;
  counts: AttendanceCounts;
  percent: number | null; // ratio 0..1, null when denominator is 0
  hasPendingJustification: boolean;
}

interface BeltBreakdown {
  key: string; // "{belt}:{degree}" | "no_graduation"
  belt: string | null;
  degree: number | null;
  pending: boolean;
  studentCount: number;
  averagePercent: number | null;
}

interface JustificationAttachment {
  url: string;
  name: string;
  size: number;
}

/** Mirrors `app/models/attendance.py` `PendingJustificationOut` — one turma
 * record awaiting staff review (the Análise queue). `attendanceId` is the
 * `attendance` doc id used by `PATCH /attendance/{id}/justification/*`. */
interface PendingJustification {
  attendanceId: string;
  userId: string;
  studentName: string;
  aulaDate: string;
  typeId: string;
  typeName: string;
  text: string;
  attachment?: JustificationAttachment | null;
}

interface AttendanceAnalytics {
  averagePercent: number | null;
  totals: AttendanceCounts;
  byBelt: BeltBreakdown[];
  students: AnalyticsStudent[];
  pendingJustifications: PendingJustification[];
}

type EngineState = "active" | "inactive" | "error";
type AnalyticsScreenState =
  | "idle"
  | "loading"
  | "loaded"
  | "engine_off"
  | "engine_error"
  | "error";
type SortDir = "asc" | "desc";
type Tab = "aprovar" | "analise";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function formatPercent(ratio: number | null): string {
  if (ratio === null || ratio === undefined) return "—";
  return `${Math.round(ratio * 100)}%`;
}

function graduationLabel(belt: string | null | undefined, degree: number | null | undefined): string {
  if (!belt) return "Sem graduação";
  return degree ? `${belt} · grau ${degree}` : belt;
}

function beltKeyOf(g?: StudentGraduation | null): string {
  if (!g || !g.belt) return "no_graduation";
  return `${g.belt}:${g.degree ?? 0}`;
}

function engineStateOf(cls: ClassOption | undefined): EngineState {
  if (!cls || !cls.attendanceEngineEnabled) return "inactive";
  if (!cls.attendanceStartDate) return "error";
  return "active";
}

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Últimos N meses (mais recente primeiro) para o seletor de período. */
function lastMonths(n: number): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: ym, label: monthLabel(ym) });
  }
  return out;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatJustificationDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

/* ── Top-level: dono da turma, do período e do painel de filtros ────────
 *
 * A turma é o ASSUNTO da tela e as abas são só modos de olhar para ela — por
 * isso a seleção vem ANTES das abas e é compartilhada entre elas. Antes cada
 * aba era uma tela própria, com header, painel e estado de turma duplicados:
 * trocar de aba perdia a turma escolhida e cada uma tinha seus filtros.
 */

export interface GradFilterOption {
  key: string;
  label: string;
}

interface AttendanceAnalyticsScreenProps {
  onBack: () => void;
}

export function AttendanceAnalyticsScreen({ onBack }: AttendanceAnalyticsScreenProps) {
  const { classes } = useClasses();

  const [tab, setTab] = useState<Tab>("aprovar");
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedModalityId, setSelectedModalityId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => currentMonthStr());
  const [selectedBeltKey, setSelectedBeltKey] = useState<string | null>(null);
  const [gradOptions, setGradOptions] = useState<GradFilterOption[]>([]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

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

  const monthOptions = useMemo(() => lastMonths(12), []);

  const onSelectClass = useCallback((classId: string) => {
    setSelectedClassId(classId);
    setSelectedBeltKey(null);
    setFilterVisible(false);
  }, []);

  // Ponto dourado: filtro fora do default. A turma não conta — ela é o
  // contexto da tela, e está escrita na barra logo abaixo do header.
  const filterActive =
    selectedModalityId !== null ||
    selectedBeltKey !== null ||
    month !== currentMonthStr();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Frequência</Text>
          <Text style={styles.headerSubtitle}>Gestão</Text>
        </View>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          hitSlop={8}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel="Filtros"
        >
          <Feather
            name="sliders"
            size={22}
            color={filterActive ? colors.primary : colors.foreground}
          />
          {filterActive && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Contexto: qual turma e qual período estão em tela. Tocar abre o
          painel — mesmo destino do ícone, no lugar onde o olho já está. */}
      <TouchableOpacity
        style={styles.contextBar}
        onPress={() => setFilterVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Trocar turma"
      >
        <View style={styles.contextTextWrap}>
          <Text style={styles.contextLabel}>TURMA</Text>
          <Text
            style={[styles.contextClass, !selectedClass && styles.contextPlaceholder]}
            numberOfLines={1}
          >
            {selectedClass ? selectedClass.name : "Selecione uma turma"}
          </Text>
          <Text style={styles.contextMeta} numberOfLines={1}>
            {selectedClass?.schedule ? `${selectedClass.schedule} · ` : ""}
            {tab === "analise" ? monthLabel(month) : "Aula de hoje"}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>

      <View style={styles.headerExtra}>
        <SegmentedControl<Tab>
          options={[
            { value: "aprovar", label: "Aprovar" },
            { value: "analise", label: "Análise" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === "aprovar" ? (
        <AttendanceApprovalScreen
          selectedClass={selectedClass}
          onOpenFilters={() => setFilterVisible(true)}
        />
      ) : (
        <AnalyticsTab
          selectedClass={selectedClass}
          month={month}
          selectedBeltKey={selectedBeltKey}
          onGradFilters={setGradOptions}
          onOpenFilters={() => setFilterVisible(true)}
        />
      )}

      {/* Um painel só, para as duas abas */}
      <FilterPanel
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Filtros"
      >
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Modalidade</Text>
          <View style={styles.chipRow}>
            {modalities.map((mod) => {
              const active = selectedModalityId === mod.id;
              return (
                <TouchableOpacity
                  key={mod.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedModalityId(active ? null : mod.id)}
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
              const state = engineStateOf(cls);
              const badge =
                state === "active"
                  ? { text: "Motor ativo", color: colors.success }
                  : state === "error"
                    ? { text: "Erro: sem data-base", color: colors.error }
                    : { text: "Motor inativo", color: colors.mutedForeground };
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
                  <Text
                    style={[
                      styles.chipBadgeText,
                      { color: active ? colors.primaryForeground : badge.color },
                    ]}
                  >
                    {badge.text}
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

        {/* Período e Graduação só valem para a Análise: a Aprovar é sempre a
            aula de hoje. Mostrar filtro que não afeta nada é ruído. */}
        {tab === "analise" && (
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Período</Text>
            <SelectBox value={month} options={monthOptions} onChange={setMonth} />
          </View>
        )}

        {tab === "analise" && gradOptions.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Graduação</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedBeltKey && styles.chipActive]}
                onPress={() => setSelectedBeltKey(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, !selectedBeltKey && styles.chipTextActive]}>
                  Todas
                </Text>
              </TouchableOpacity>
              {gradOptions.map((g) => {
                const active = selectedBeltKey === g.key;
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedBeltKey(active ? null : g.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </FilterPanel>
    </SafeAreaView>
  );
}
/* ── "Análise" tab content ─────────────────────────────────────────────── */

function AnalyticsTab({
  selectedClass,
  month,
  selectedBeltKey,
  onGradFilters,
  onOpenFilters,
}: {
  selectedClass: ClassOption | undefined;
  month: string;
  selectedBeltKey: string | null;
  onGradFilters: (options: GradFilterOption[]) => void;
  onOpenFilters: () => void;
}) {
  const dialog = useDialog();

  const selectedClassId = selectedClass?.id ?? null;
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [screenState, setScreenState] = useState<AnalyticsScreenState>("idle");
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [justificationActionId, setJustificationActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingJustification | null>(null);

  const loadAnalytics = useCallback(async (classId: string, ym: string) => {
    setScreenState("loading");
    try {
      const data = await api.get<AttendanceAnalytics>(
        `/attendance/analytics/${encodeURIComponent(classId)}?month=${encodeURIComponent(ym)}`,
      );
      setAnalytics(data);
      setScreenState("loaded");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Defensive fallback — the client already gates on the turma's own
        // attendanceEngineEnabled/attendanceStartDate before fetching, but
        // this covers a race (e.g. backoffice toggling the engine mid-session).
        setScreenState(err.message.includes("data-base") ? "engine_error" : "engine_off");
      } else {
        setScreenState("error");
      }
    }
  }, []);

  // Reacts to turma/month changes: gate on the engine state we already know
  // client-side (from the turma's own fields) before ever calling the API.
  useEffect(() => {
    if (!selectedClassId) {
      setScreenState("idle");
      return;
    }
    const state = engineStateOf(selectedClass);
    if (state === "inactive") {
      setAnalytics(null);
      setScreenState("engine_off");
      return;
    }
    if (state === "error") {
      setAnalytics(null);
      setScreenState("engine_error");
      return;
    }
    void loadAnalytics(selectedClassId, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, month, selectedClass]);

  const approveJustification = useCallback(
    async (item: PendingJustification) => {
      setJustificationActionId(item.attendanceId);
      try {
        await api.patch(
          `/attendance/${encodeURIComponent(item.attendanceId)}/justification/approve`,
          {},
        );
        if (selectedClassId) await loadAnalytics(selectedClassId, month);
      } catch (err) {
        dialog.alert({
          title: "Erro",
          message:
            err instanceof Error
              ? err.message
              : "Não foi possível aprovar a justificativa.",
          tone: "danger",
        });
      } finally {
        setJustificationActionId(null);
      }
    },
    [selectedClassId, month, loadAnalytics, dialog],
  );

  const rejectJustification = useCallback(
    async (item: PendingJustification, reason: string) => {
      setJustificationActionId(item.attendanceId);
      try {
        await api.patch(
          `/attendance/${encodeURIComponent(item.attendanceId)}/justification/reject`,
          { reason },
        );
        if (selectedClassId) await loadAnalytics(selectedClassId, month);
      } catch (err) {
        dialog.alert({
          title: "Erro",
          message:
            err instanceof Error
              ? err.message
              : "Não foi possível recusar a justificativa.",
          tone: "danger",
        });
      } finally {
        setJustificationActionId(null);
      }
    },
    [selectedClassId, month, loadAnalytics, dialog],
  );

  const gradFilters = useMemo(
    () => (analytics?.byBelt ?? []).filter((b) => b.studentCount > 0),
    [analytics],
  );

  // As opções de graduação só existem depois da análise carregar, então a aba
  // publica a lista para o painel de filtros, que é do pai (uma tela, um painel).
  useEffect(() => {
    onGradFilters(
      gradFilters.map((b) => ({
        key: b.key,
        label:
          (b.key === "no_graduation"
            ? "Sem graduação"
            : graduationLabel(b.belt, b.degree)) + (b.pending ? " · em análise" : ""),
      })),
    );
  }, [gradFilters, onGradFilters]);

  const filteredStudents = useMemo(() => {
    const list = analytics?.students ?? [];
    const scoped = selectedBeltKey
      ? list.filter((s) => beltKeyOf(s.graduation) === selectedBeltKey)
      : list;
    return [...scoped].sort((a, b) => {
      if (a.percent === null && b.percent === null) return a.name.localeCompare(b.name);
      if (a.percent === null) return 1;
      if (b.percent === null) return -1;
      return sortDir === "asc" ? a.percent - b.percent : b.percent - a.percent;
    });
  }, [analytics, selectedBeltKey, sortDir]);

  return (
    <>
      {screenState === "idle" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="bar-chart-2" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Selecione uma turma</Text>
          <Text style={styles.emptyMsg}>
            Escolha uma turma para ver a análise agregada de frequência.
          </Text>
          <View style={styles.idleAction}>
            <Button label="Selecionar turma" onPress={onOpenFilters} />
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
            Não foi possível buscar a análise desta turma.
          </Text>
          <View style={styles.idleAction}>
            <Button
              label="Tentar novamente"
              onPress={() => {
                if (selectedClassId) void loadAnalytics(selectedClassId, month);
              }}
            />
          </View>
        </View>
      )}

      {(screenState === "engine_off" || screenState === "engine_error") && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <EngineStateCard
            cls={selectedClass}
            state={screenState === "engine_off" ? "inactive" : "error"}
          />
        </ScrollView>
      )}

      {screenState === "loaded" && analytics && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Roll-up */}
          <View style={styles.rollup}>
            <View style={styles.rollupTop}>
              <View style={styles.avgWrap}>
                <Text style={styles.avgValue}>{formatPercent(analytics.averagePercent)}</Text>
                <Text style={styles.avgLabel}>média</Text>
              </View>
              <View style={styles.whoWrap}>
                <Text style={styles.whoValue}>
                  {analytics.students.length} aluno{analytics.students.length !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.whoLabel}>na janela da turma</Text>
              </View>
            </View>

            <View style={styles.miniStats}>
              <MiniStat value={analytics.totals.confirmed} label="Present." color={colors.success} />
              <MiniStat value={analytics.totals.absent} label="Faltas" color={colors.error} />
              <MiniStat value={analytics.totals.justificationPending} label="Análise" color={colors.warning} />
              <MiniStat value={analytics.totals.absentJustified} label="Justif." color={colors.primary} />
            </View>

            {analytics.byBelt.length > 0 && (
              <View style={styles.byband}>
                {analytics.byBelt.map((b) => (
                  <BandRow key={b.key} belt={b} modalityName={selectedClass?.modality} />
                ))}
              </View>
            )}
          </View>

          {/* Justificativas pendentes (Task B8 — fila de análise do staff) */}
          <View style={styles.studentsHeader}>
            <Text style={styles.sectionTitle}>JUSTIFICATIVAS PENDENTES</Text>
            {analytics.pendingJustifications.length > 0 && (
              <Text style={styles.sortLink}>{analytics.pendingJustifications.length}</Text>
            )}
          </View>

          {analytics.pendingJustifications.length === 0 ? (
            <View style={styles.inlineEmpty}>
              <Feather name="check-circle" size={22} color={colors.success} />
              <Text style={styles.inlineEmptyText}>
                Nenhuma justificativa pendente nesta turma/mês.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {analytics.pendingJustifications.map((item) => (
                <PendingJustificationCard
                  key={item.attendanceId}
                  item={item}
                  busy={justificationActionId === item.attendanceId}
                  onApprove={() => void approveJustification(item)}
                  onReject={() => setRejectTarget(item)}
                />
              ))}
            </View>
          )}

          {/* Students */}
          <View style={styles.studentsHeader}>
            <Text style={styles.sectionTitle}>ALUNOS</Text>
            <TouchableOpacity
              onPress={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              hitSlop={6}
            >
              <Text style={styles.sortLink}>
                ordenar: {sortDir === "asc" ? "menor" : "maior"} % ▾
              </Text>
            </TouchableOpacity>
          </View>

          {filteredStudents.length === 0 ? (
            <View style={styles.inlineEmpty}>
              <Feather name="users" size={22} color={colors.mutedForeground} />
              <Text style={styles.inlineEmptyText}>Nenhum aluno para este filtro.</Text>
            </View>
          ) : (
            filteredStudents.map((s) => (
              <StudentRow key={s.userId} student={s} modalityName={selectedClass?.modality} />
            ))
          )}
        </ScrollView>
      )}

      {/* Recusar justificativa — motivo obrigatório */}
      <ReasonPrompt
        visible={rejectTarget !== null}
        title="Motivo da recusa"
        confirmText="Recusar"
        onCancel={() => setRejectTarget(null)}
        onSubmit={(reason) => {
          const target = rejectTarget;
          setRejectTarget(null);
          if (target) void rejectJustification(target, reason);
        }}
      />
    </>
  );
}
function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function BandRow({ belt, modalityName }: { belt: BeltBreakdown; modalityName?: string }) {
  const color = belt.key === "no_graduation" ? NO_GRADUATION_COLOR : getBeltColor(modalityName, belt.belt);
  const pct = belt.averagePercent !== null ? Math.round(belt.averagePercent * 100) : 0;
  return (
    <View style={styles.band}>
      <View style={styles.bandLabel}>
        <View style={[styles.bandDot, { backgroundColor: color }]} />
        <Text style={styles.bandName} numberOfLines={1}>
          {belt.key === "no_graduation" ? "Sem grad." : graduationLabel(belt.belt, belt.degree)}
        </Text>
        <Text style={styles.bandCount}>{belt.studentCount}</Text>
      </View>
      <View style={styles.bandTrack}>
        <View style={[styles.bandFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.bandPercent}>{formatPercent(belt.averagePercent)}</Text>
    </View>
  );
}

function StudentRow({ student, modalityName }: { student: AnalyticsStudent; modalityName?: string }) {
  const belowThreshold = student.percent !== null && student.percent < 0.6;
  const flagStyle = belowThreshold
    ? styles.studentFlagDanger
    : student.hasPendingJustification
      ? styles.studentFlagWarning
      : null;
  const beltColor = student.graduation?.belt
    ? getBeltColor(modalityName, student.graduation.belt)
    : NO_GRADUATION_COLOR;

  return (
    <View style={[styles.student, flagStyle]}>
      <UserAvatar name={student.name} photoUrl={student.photoUrl} size={38} />
      <View style={styles.studentInfo}>
        <View style={styles.studentNameRow}>
          <View style={[styles.beltMini, { backgroundColor: beltColor }]} />
          <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
        </View>
        <View style={styles.studentMetaRow}>
          <Text style={styles.studentMeta} numberOfLines={1}>
            {graduationLabel(student.graduation?.belt, student.graduation?.degree)}
          </Text>
          {student.hasPendingJustification ? (
            <View style={styles.pillRev}>
              <Text style={styles.pillRevText}>
                {student.counts.justificationPending} EM ANÁLISE
              </Text>
            </View>
          ) : (
            <Text style={styles.studentMeta}>
              · {student.counts.confirmed} presença{student.counts.confirmed !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.pctWrap}>
        <Text style={[styles.pctValue, belowThreshold && styles.pctValueDanger]}>
          {formatPercent(student.percent)}
        </Text>
        <Text style={styles.pctMini}>
          {student.counts.absent} falta{student.counts.absent !== 1 ? "s" : ""}
        </Text>
      </View>
    </View>
  );
}

function PendingJustificationCard({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: PendingJustification;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.justCard}>
      <View style={styles.justInfo}>
        <Text style={styles.justName} numberOfLines={1}>{item.studentName}</Text>
        <Text style={styles.justMeta}>
          {formatJustificationDate(item.aulaDate)} · {item.typeName}
        </Text>
      </View>

      <Text style={styles.justText}>{item.text}</Text>

      {item.attachment && (
        <TouchableOpacity
          style={styles.justAttachment}
          onPress={() => Linking.openURL(item.attachment!.url)}
          activeOpacity={0.7}
        >
          <Feather name="paperclip" size={14} color={colors.primary} />
          <Text style={styles.justAttachmentName} numberOfLines={1}>
            {item.attachment.name}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.justActions}>
        <TouchableOpacity
          style={[styles.justActionBtn, styles.justApproveBtn]}
          onPress={onApprove}
          disabled={busy}
          activeOpacity={0.7}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <>
              <Feather name="check" size={14} color={colors.success} />
              <Text style={[styles.justActionText, { color: colors.success }]}>Aprovar</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.justActionBtn, styles.justRejectBtn]}
          onPress={onReject}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Feather name="x" size={14} color={colors.error} />
          <Text style={[styles.justActionText, { color: colors.error }]}>Recusar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EngineStateCard({ cls, state }: { cls?: ClassOption; state: "inactive" | "error" }) {
  const isError = state === "error";
  return (
    <View style={[styles.engineOff, isError && styles.engineOffError]}>
      <Feather
        name={isError ? "alert-triangle" : "moon"}
        size={18}
        color={isError ? colors.error : colors.mutedForeground}
      />
      <Text style={styles.engineOffText}>
        <Text style={styles.engineOffBold}>{cls?.name ?? "Esta turma"}</Text>
        {isError
          ? " — motor ligado sem data-base. Tratada como desligada; o job registrou log de inconsistência para o admin corrigir."
          : " — motor de frequência desligado. Check-in, contagem e job de faltas não rodam nesta turma."}
      </Text>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */

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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  headerSubtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 2,
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
  headerExtra: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  // Scroll
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  contextBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contextTextWrap: { flex: 1, minWidth: 0, gap: 1 },
  contextLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  contextPlaceholder: { color: colors.mutedForeground },
  contextMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },

  contextClass: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },

  // Graduação chips
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
    fontFamily: typography.fontBodySemiBold,
  },

  // Roll-up card
  rollup: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  rollupTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  avgWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  avgValue: {
    color: colors.primary,
    fontFamily: typography.fontHeading,
    fontSize: 30,
  },
  avgLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  whoWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  whoValue: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  whoLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },

  miniStats: {
    flexDirection: "row",
    gap: spacing.xs + 2,
  },
  miniStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
  },
  miniStatValue: {
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  miniStatLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },

  byband: {
    gap: spacing.sm,
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bandLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 108,
  },
  bandDot: {
    width: 16,
    height: 9,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  bandName: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 11.5,
  },
  bandCount: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 10,
  },
  bandTrack: {
    flex: 1,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  bandFill: {
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  bandPercent: {
    width: 34,
    textAlign: "right",
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 12,
  },

  // Students section
  studentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 11,
    letterSpacing: 1,
  },
  sortLink: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
  },

  // Justificativas pendentes (fila de análise)
  justCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    padding: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  justInfo: {
    gap: 2,
  },
  justName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  justMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },
  justText: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    lineHeight: 18,
  },
  justAttachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  justAttachmentName: {
    color: colors.primary,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
    maxWidth: 220,
  },
  justActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  justActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  justApproveBtn: {
    borderColor: "rgba(76,175,80,0.4)",
    backgroundColor: "rgba(76,175,80,0.08)",
  },
  justRejectBtn: {
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  justActionText: {
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },

  student: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 3,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  studentFlagDanger: {
    borderColor: "rgba(239,68,68,0.5)",
  },
  studentFlagWarning: {
    borderColor: "rgba(245,158,11,0.45)",
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  beltMini: {
    width: 16,
    height: 9,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  studentName: {
    flexShrink: 1,
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  studentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  studentMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },
  pillRev: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  pillRevText: {
    color: colors.warning,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 9.5,
  },
  pctWrap: {
    alignItems: "flex-end",
  },
  pctValue: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 17,
  },
  pctValueDanger: {
    color: colors.error,
  },
  pctMini: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 10,
    marginTop: 1,
  },

  // Empty states
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

  // Engine-off / engine-error inline card
  engineOff: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  engineOffError: {
    borderColor: "rgba(239,68,68,0.5)",
  },
  engineOffText: {
    flex: 1,
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    lineHeight: 17,
  },
  engineOffBold: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
  },

  // Filter panel content (turma picker)
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
  chipBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontBodySemiBold,
    marginTop: 2,
  },
  filterEmpty: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
});
