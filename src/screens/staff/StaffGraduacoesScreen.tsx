import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { FilterPanel } from "../../components/ui/FilterPanel";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { useDialog } from "../../components/ui/DialogProvider";
import { FamilyCard } from "../../components/graduation/FamilyCard";
import { GraduationActionSheet } from "../../components/graduation/GraduationActionSheet";
import type {
  GradAction,
  GradCard,
  RosterFamily,
  RosterOut,
} from "../../components/graduation/types";

type ScreenState = "loading" | "loaded" | "error";
type Filter = "pending" | "all";

interface StaffGraduacoesScreenProps {
  onBack: () => void;
}

function familyNeedsAttention(family: RosterFamily): boolean {
  const people = [family.guardian, ...family.dependents];
  return people.some((p) =>
    p.graduations.some((g) => g.status === "pending" || g.status === "rejected"),
  );
}

export function StaffGraduacoesScreen({ onBack }: StaffGraduacoesScreenProps) {
  const dialog = useDialog();
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [roster, setRoster] = useState<RosterOut | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [menuCard, setMenuCard] = useState<GradCard | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchRoster = useCallback(async (opts?: { silent?: boolean }) => {
    // silent: refetch pós-ação — mantém a lista montada para preservar o scroll
    const silent = opts?.silent === true;
    if (!silent) setScreenState("loading");
    try {
      const data = await api.get<RosterOut>("/graduations/dashboard?view=roster");
      setRoster(data);
      setScreenState("loaded");
    } catch (err) {
      if (silent) throw err;
      setScreenState("error");
    }
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const runAction = useCallback(
    async (action: GradAction, card: GradCard) => {
      if (action === "reject") {
        const ok = await dialog.confirm({
          title: "Reprovar graduação",
          message: `Reprovar a graduação de ${card.nickname ?? card.name} em ${card.modalityName}? O aluno poderá corrigir e reenviar.`,
          confirmText: "Reprovar",
          cancelText: "Cancelar",
          tone: "danger",
        });
        if (!ok) return;
      }
      setBusy(`${card.userId}_${card.modalitySlug}`);
      try {
        const uid = card.userId;
        const body = { modality: card.modalitySlug } as Record<string, unknown>;
        if (action === "approve") await api.post(`/graduations/${uid}/approve`, body);
        else if (action === "reject") await api.post(`/graduations/${uid}/reject`, body);
        else if (action === "undo") await api.post(`/graduations/${uid}/undo`, body);
        else if (action === "degree")
          await api.post(`/graduations/${uid}/promote`, { ...body, kind: "degree" });
        else if (action === "belt")
          await api.post(`/graduations/${uid}/promote`, { ...body, kind: "belt" });
        await fetchRoster({ silent: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao processar graduação.";
        dialog.alert({ title: "Erro", message, tone: "danger" });
      } finally {
        setBusy(null);
      }
    },
    [dialog, fetchRoster],
  );

  const openMenu = useCallback((card: GradCard) => setMenuCard(card), []);
  const closeMenu = useCallback(() => setMenuCard(null), []);
  const handleMenuAction = useCallback(
    (action: GradAction, card: GradCard) => {
      setMenuCard(null);
      runAction(action, card);
    },
    [runAction],
  );

  const families = useMemo(() => {
    const all = roster?.families ?? [];
    return filter === "pending" ? all.filter(familyNeedsAttention) : all;
  }, [roster, filter]);

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

  if (screenState === "error") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader onBack={onBack} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={28} color={colors.error} />
          </View>
          <Text style={styles.emptyTitle}>Falha ao carregar</Text>
          <Text style={styles.emptyMsg}>Não foi possível buscar as graduações.</Text>
        </View>
        <View style={styles.footer}>
          <Button label="Tentar novamente" onPress={() => fetchRoster()} />
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = roster?.pendingCount ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        onBack={onBack}
        onFilter={() => setFiltersOpen(true)}
        filterActive={filter !== "pending"}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {pendingCount > 0 && (
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{pendingCount}</Text>
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroBig}>
                {pendingCount} graduaç{pendingCount === 1 ? "ão" : "ões"} aguardando aprovação
              </Text>
              <Text style={styles.heroSub}>Toque em Aprovar ou Reprovar para revisar.</Text>
            </View>
          </View>
        )}

        {families.length === 0 ? (
          <View style={styles.centerInline}>
            <View style={styles.emptyIcon}>
              <Feather name="award" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === "pending" ? "Nenhuma graduação pendente" : "Nenhum aluno no roster"}
            </Text>
            <Text style={styles.emptyMsg}>
              {filter === "pending"
                ? "Todas as graduações foram processadas."
                : "Ainda não há alunos cadastrados neste projeto."}
            </Text>
          </View>
        ) : (
          families.map((family) => (
            <FamilyCard
              key={family.guardian.userId}
              family={family}
              busy={busy}
              onAction={runAction}
              onOpenMenu={openMenu}
            />
          ))
        )}
      </ScrollView>

      {/* Filtros — padrão do app: só no painel lateral, nunca no corpo da tela */}
      <FilterPanel
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
      >
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Situação</Text>
          <SegmentedControl<Filter>
            options={[
              { value: "pending", label: "Pendentes" },
              { value: "all", label: "Todos" },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </View>
      </FilterPanel>

      <GraduationActionSheet
        card={menuCard}
        visible={menuCard !== null}
        onClose={closeMenu}
        onAction={handleMenuAction}
      />
    </SafeAreaView>
  );
}

function ScreenHeader({
  onBack,
  onFilter,
  filterActive = false,
}: {
  onBack: () => void;
  onFilter?: () => void;
  filterActive?: boolean;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={8}>
        <Feather name="chevron-left" size={24} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Graduações</Text>
      {onFilter ? (
        <TouchableOpacity
          style={styles.headerAction}
          onPress={onFilter}
          hitSlop={8}
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
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  centerInline: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
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
  headerAction: { width: 24, alignItems: "center", justifyContent: "center" },
  filterDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    backgroundColor: "rgba(198,163,78,0.10)",
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontHeading,
    fontSize: 18,
  },
  heroTextWrap: { flex: 1 },
  heroBig: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  heroSub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 2,
  },
  filterSection: { gap: spacing.sm, marginTop: spacing.md },
  filterSectionTitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },

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
