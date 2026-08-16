import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api, getProjectId } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { FilterPanel } from "../../components/ui/FilterPanel";
import { ConfirmationModal } from "../../components/timeline/ConfirmationModal";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { useDialog } from "../../components/ui/DialogProvider";

/* ── Types ─────────────────────────────────────────────────────── */

interface SupportDashboard {
  month: string;
  monthLabel: string;
  items: SupportItem[];
}

interface SupportItem {
  id: string;
  userId: string;
  name: string;
  nickname?: string | null;
  initials: string;
  age?: number | null;
  photoUrl?: string | null;
  supportType: "donation" | "service";
  item?: string | null;
  itemLabel?: string | null;
  itemDescription?: string | null;
  status: "pledged" | "received" | "absent";
  createdAt?: string | null;
}

interface SupportConfig {
  donations: { code: string; label: string; active: boolean }[];
  services: { code: string; label: string; active: boolean }[];
}

type ScreenState = "loading" | "loaded" | "empty" | "error";
type TypeFilter = "all" | "donation" | "service";

/* ── Month helpers ──────────────────────────────────────────────── */

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ── Badge colors ───────────────────────────────────────────────── */

const TYPE_BADGE: Record<SupportItem["supportType"], { label: string; color: string; bg: string }> =
  {
    donation: { label: "Doação", color: "#0D9488", bg: "rgba(13,148,136,0.12)" },
    service: { label: "Serviço", color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
  };

const STATUS_BADGE: Record<
  SupportItem["status"],
  { label: string; color: string; bg: string }
> = {
  pledged: { label: "Aguardando", color: colors.warning, bg: "rgba(245,158,11,0.1)" },
  received: { label: "Aprovado", color: colors.success, bg: "rgba(76,175,80,0.1)" },
  absent: { label: "Reprovado", color: colors.mutedForeground, bg: "rgba(153,153,153,0.1)" },
};

/* ── Props ──────────────────────────────────────────────────────── */

interface DonationApprovalScreenProps {
  onBack: () => void;
}

/* ── Component ─────────────────────────────────────────────────── */

export function DonationApprovalScreen({ onBack }: DonationApprovalScreenProps) {
  const dialog = useDialog();

  /* ── Core state ── */
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dashboard, setDashboard] = useState<SupportDashboard | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [filterVisible, setFilterVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SupportItem | null>(null);

  /* ── Register modal state ── */
  const [registerVisible, setRegisterVisible] = useState(false);
  const [regType, setRegType] = useState<"donation" | "service">("donation");
  const [regItem, setRegItem] = useState<string>("");
  const [regDescription, setRegDescription] = useState<string>("");
  const [regSearch, setRegSearch] = useState<string>("");
  const [regSearchResults, setRegSearchResults] = useState<{ uid: string; name: string }[]>([]);
  const [regSelectedUser, setRegSelectedUser] = useState<{ uid: string; name: string } | null>(
    null,
  );
  const [regConfig, setRegConfig] = useState<SupportConfig | null>(null);
  const [regConfigLoading, setRegConfigLoading] = useState(false);
  const [regSearchLoading, setRegSearchLoading] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch dashboard ── */

  const loadDashboard = useCallback(async () => {
    setScreenState("loading");
    try {
      const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";
      const data = await api.get<SupportDashboard>(
        `/support/dashboard?month=${encodeURIComponent(monthKey)}${typeParam}`,
      );
      setDashboard(data);
      setScreenState(data.items.length > 0 ? "loaded" : "empty");
    } catch {
      setScreenState("error");
    }
  }, [monthKey, typeFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ── Actions ── */

  async function validate(it: SupportItem, status: "received" | "absent") {
    setActionLoading(it.id);
    try {
      await api.patch(`/support/${encodeURIComponent(it.id)}/validate`, { status });
      await loadDashboard();
    } catch (err) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao validar apoio.",
        tone: "danger",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function undo(it: SupportItem) {
    setActionLoading(it.id);
    try {
      await api.post(`/support/${encodeURIComponent(it.id)}/undo-validation`, {});
      await loadDashboard();
    } catch (err) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao desfazer.",
        tone: "danger",
      });
    } finally {
      setActionLoading(null);
    }
  }

  function openRejectConfirm(item: SupportItem) {
    setRejectTarget(item);
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    void validate(target, "absent");
  }

  /* ── Register modal ── */

  async function openRegisterModal() {
    setRegType("donation");
    setRegItem("");
    setRegDescription("");
    setRegSearch("");
    setRegSearchResults([]);
    setRegSelectedUser(null);
    setRegConfig(null);
    setRegConfigLoading(true);
    setRegisterVisible(true);
    try {
      const cfg = await api.get<SupportConfig>(`/projects/${getProjectId()}/support-config`);
      setRegConfig(cfg);
    } catch (err) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao carregar configuração.",
        tone: "danger",
      });
      setRegisterVisible(false);
    } finally {
      setRegConfigLoading(false);
    }
  }

  function handleRegSearch(text: string) {
    setRegSearch(text);
    setRegSelectedUser(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (text.length < 2) {
      setRegSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setRegSearchLoading(true);
      try {
        const res = await api.get<{ items: { uid: string; name: string }[] }>(
          `/accounts?role=student&search=${encodeURIComponent(text)}&pageSize=8`,
        );
        setRegSearchResults(res.items);
      } catch {
        setRegSearchResults([]);
      } finally {
        setRegSearchLoading(false);
      }
    }, 300);
  }

  async function handleRegSubmit() {
    if (!regSelectedUser) {
      dialog.alert({ title: "Atenção", message: "Selecione um aluno." });
      return;
    }
    if (!regItem) {
      dialog.alert({ title: "Atenção", message: "Selecione um item de apoio." });
      return;
    }
    setRegSubmitting(true);
    try {
      await api.post("/support/register-received", {
        userId: regSelectedUser.uid,
        supportType: regType,
        item: regItem,
        itemDescription: regItem === "other" ? regDescription : undefined,
      });
      setRegisterVisible(false);
      await loadDashboard();
    } catch (err) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao registrar apoio.",
        tone: "danger",
      });
    } finally {
      setRegSubmitting(false);
    }
  }

  /* ── Render helpers ── */

  function renderTypeBadge(supportType: SupportItem["supportType"]) {
    const cfg = TYPE_BADGE[supportType];
    return (
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  }

  function renderStatusBadge(status: SupportItem["status"]) {
    const cfg = STATUS_BADGE[status];
    return (
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  }

  function renderCard(item: SupportItem) {
    const displayName = item.nickname ?? item.name;
    const isActing = actionLoading === item.id;
    const busy = actionLoading !== null;

    return (
      <View key={item.id} style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <UserAvatar name={item.name} photoUrl={item.photoUrl} size={36} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{displayName}</Text>
            {item.nickname != null && item.nickname !== item.name && (
              <Text style={styles.cardSubName}>{item.name}</Text>
            )}
          </View>
          <View style={styles.badgeCol}>
            {renderTypeBadge(item.supportType)}
            {renderStatusBadge(item.status)}
          </View>
        </View>

        {/* Item info */}
        {(item.itemLabel != null || item.itemDescription != null) && (
          <View style={styles.itemInfo}>
            {item.itemLabel != null && (
              <Text style={styles.itemLabel}>{item.itemLabel}</Text>
            )}
            {item.itemDescription != null && (
              <Text style={styles.itemDescription}>{item.itemDescription}</Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          {item.status === "pledged" && (
            <>
              <Button
                label="Aprovar"
                variant="primary"
                loading={isActing}
                disabled={busy}
                onPress={() => { void validate(item, "received"); }}
                style={styles.actionBtn}
              />
              <Button
                label="Reprovar"
                variant="outline"
                loading={false}
                disabled={busy}
                onPress={() => openRejectConfirm(item)}
                style={[styles.actionBtn, styles.rejectBtn]}
                textStyle={styles.rejectBtnText}
              />
            </>
          )}

          {item.status === "received" && (
            <View style={styles.approvedRow}>
              <View style={styles.approvedLabel}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={styles.approvedText}>Aprovado</Text>
              </View>
              <Button
                label="Desfazer"
                variant="outline"
                loading={isActing}
                disabled={busy}
                onPress={() => {
                  void (async () => {
                    const ok = await dialog.confirm({
                      title: "Desfazer aprovação",
                      message: `Desfazer a aprovação de ${displayName}?`,
                      confirmText: "Desfazer",
                      cancelText: "Cancelar",
                      tone: "danger",
                    });
                    if (ok) void undo(item);
                  })();
                }}
                style={styles.undoBtn}
              />
            </View>
          )}

          {item.status === "absent" && (
            <Button
              label="Aprovar"
              variant="primary"
              loading={isActing}
              disabled={busy}
              onPress={() => { void validate(item, "received"); }}
              style={[styles.actionBtn, styles.fullBtn]}
            />
          )}
        </View>
      </View>
    );
  }

  /* ── Register modal items ── */

  function getActiveItems() {
    if (!regConfig) return [];
    const list = regType === "donation" ? regConfig.donations : regConfig.services;
    return list.filter((i) => i.active);
  }

  /* ── Main render ── */

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apoio</Text>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          hitSlop={8}
          style={styles.filterBtn}
        >
          <Feather name="sliders" size={22} color={colors.foreground} />
          {typeFilter !== "all" && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Month bar */}
      <View style={styles.monthBar}>
        <TouchableOpacity
          onPress={() => setMonthKey((k) => shiftMonth(k, -1))}
          hitSlop={8}
          style={styles.monthChevron}
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {dashboard?.monthLabel ?? monthKey}
        </Text>
        <TouchableOpacity
          onPress={() => setMonthKey((k) => shiftMonth(k, 1))}
          hitSlop={8}
          style={styles.monthChevron}
        >
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMonthKey(currentMonthKey())}
          style={styles.todayBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.todayBtnText}>Mês atual</Text>
        </TouchableOpacity>
      </View>

      {/* Register button */}
      <View style={styles.registerBar}>
        <Button
          label="Registrar apoio"
          variant="outline"
          onPress={() => { void openRegisterModal(); }}
          style={styles.registerBtn}
        />
      </View>

      {/* Body */}
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
          <Text style={styles.emptyMsg}>Não foi possível buscar os apoios do mês.</Text>
          <View style={styles.stateAction}>
            <Button label="Tentar novamente" onPress={() => { void loadDashboard(); }} />
          </View>
        </View>
      )}

      {screenState === "empty" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="gift" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum apoio registrado</Text>
          <Text style={styles.emptyMsg}>Nenhum apoio registrado neste mês.</Text>
        </View>
      )}

      {screenState === "loaded" && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countLabel}>
            {dashboard!.items.length} apoio{dashboard!.items.length !== 1 ? "s" : ""}
          </Text>
          {dashboard!.items.map(renderCard)}
        </ScrollView>
      )}

      {/* Filter panel */}
      <FilterPanel
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Filtrar"
      >
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Tipo</Text>
          <View style={styles.chipRow}>
            {(
              [
                { key: "all", label: "Todos" },
                { key: "donation", label: "Doação" },
                { key: "service", label: "Serviço" },
              ] as { key: TypeFilter; label: string }[]
            ).map(({ key, label }) => {
              const active = typeFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setTypeFilter(key);
                    setFilterVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </FilterPanel>

      {/* Reject confirmation modal */}
      {rejectTarget !== null && (
        <ConfirmationModal
          visible
          action="absent"
          entityLabel="apoio"
          targetName={rejectTarget.nickname ?? rejectTarget.name}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Register modal */}
      <Modal
        visible={registerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRegisterVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar apoio</Text>
              <TouchableOpacity
                onPress={() => setRegisterVisible(false)}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {regConfigLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                {/* Type tabs */}
                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={styles.tabRow}>
                  {(
                    [
                      { key: "donation", label: "Doação" },
                      { key: "service", label: "Serviço" },
                    ] as { key: "donation" | "service"; label: string }[]
                  ).map(({ key, label }) => {
                    const active = regType === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.tab, active && styles.tabActive]}
                        onPress={() => {
                          setRegType(key);
                          setRegItem("");
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Item selection */}
                <Text style={styles.fieldLabel}>Item</Text>
                <View style={styles.itemList}>
                  {getActiveItems().map((itm) => {
                    const active = regItem === itm.code;
                    return (
                      <TouchableOpacity
                        key={itm.code}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setRegItem(itm.code)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {itm.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {getActiveItems().length === 0 && (
                    <Text style={styles.fieldHint}>Nenhum item configurado para este tipo.</Text>
                  )}
                </View>

                {/* Description (only for "other") */}
                {regItem === "other" && (
                  <>
                    <Text style={styles.fieldLabel}>Descrição</Text>
                    <TextInput
                      style={styles.textInput}
                      value={regDescription}
                      onChangeText={setRegDescription}
                      placeholder="Descreva o apoio..."
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                      numberOfLines={3}
                    />
                  </>
                )}

                {/* Student search */}
                <Text style={styles.fieldLabel}>Aluno</Text>
                {regSelectedUser != null ? (
                  <View style={styles.selectedUser}>
                    <UserAvatar name={regSelectedUser.name} size={28} />
                    <Text style={styles.selectedUserName}>{regSelectedUser.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setRegSelectedUser(null);
                        setRegSearch("");
                        setRegSearchResults([]);
                      }}
                      hitSlop={8}
                    >
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.textInput}
                      value={regSearch}
                      onChangeText={handleRegSearch}
                      placeholder="Buscar aluno (mín. 2 caracteres)..."
                      placeholderTextColor={colors.mutedForeground}
                      autoCorrect={false}
                    />
                    {regSearchLoading && (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.searchSpinner}
                      />
                    )}
                    {regSearchResults.length > 0 && (
                      <View style={styles.searchResults}>
                        {regSearchResults.map((u) => (
                          <TouchableOpacity
                            key={u.uid}
                            style={styles.searchResultItem}
                            onPress={() => {
                              setRegSelectedUser(u);
                              setRegSearch(u.name);
                              setRegSearchResults([]);
                            }}
                            activeOpacity={0.7}
                          >
                            <UserAvatar name={u.name} size={28} />
                            <Text style={styles.searchResultName}>{u.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {regSearch.length >= 2 &&
                      !regSearchLoading &&
                      regSearchResults.length === 0 && (
                        <Text style={styles.fieldHint}>Nenhum aluno encontrado.</Text>
                      )}
                  </>
                )}

                {/* Submit */}
                <Button
                  label="Confirmar"
                  variant="primary"
                  loading={regSubmitting}
                  disabled={!regSelectedUser || !regItem || regSubmitting}
                  onPress={() => { void handleRegSubmit(); }}
                  style={styles.submitBtn}
                />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Month bar
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  monthChevron: {
    padding: spacing.xs,
  },
  monthLabel: {
    flex: 1,
    textAlign: "center",
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  todayBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  todayBtnText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },

  // Register button bar
  registerBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  registerBtn: {
    height: 40,
  },

  // Scroll
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
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
  badgeCol: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontFamily: typography.fontBodyMedium,
    fontSize: 11,
  },

  // Item info
  itemInfo: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  itemDescription: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
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
  approvedRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  approvedLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  approvedText: {
    color: colors.success,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  undoBtn: {
    height: 36,
    paddingHorizontal: spacing.md,
  },

  // Empty / error states
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
  stateAction: {
    width: "100%",
    marginTop: spacing.xl,
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

  // Register modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  modalLoading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  modalScroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },

  // Register form fields
  fieldLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  tabText: {
    fontFamily: typography.fontBodyMedium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
  },
  itemList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
  },
  fieldHint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontStyle: "italic",
  },
  searchSpinner: {
    marginTop: spacing.sm,
  },
  searchResults: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultName: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 14,
  },
  selectedUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  selectedUserName: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 14,
  },
  submitBtn: {
    marginTop: spacing.lg,
  },
});
