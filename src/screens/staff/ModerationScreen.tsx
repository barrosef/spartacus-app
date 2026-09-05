import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { useDialog } from "../../components/ui/DialogProvider";
import { ReasonPrompt } from "../../components/staff/ReasonPrompt";

/* ── Types ─────────────────────────────────────────────────────── */

type ModerationLevel = "none" | "comment_blocked" | "app_banned";
type StatusFilter = "" | ModerationLevel;
type ScreenState = "idle" | "loading" | "loaded" | "error";

interface ModeratedUser {
  uid: string;
  name: string;
  roleLabel: string;
  photoUrl?: string | null;
  level: ModerationLevel;
  isStaff: boolean;
}

interface RowAction {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  kind: "restrict" | "lift";
  level?: "comment_blocked" | "app_banned";
  danger?: boolean;
}

interface PendingRestrict {
  user: ModeratedUser;
  level: "comment_blocked" | "app_banned";
}

/* ── Status chip meta ──────────────────────────────────────────── */

const LEVEL_META: Record<ModerationLevel, { label: string; color: string; bg: string }> = {
  none: { label: "Normal", color: colors.success, bg: "rgba(76,175,80,0.1)" },
  comment_blocked: {
    label: "Sem comentários",
    color: colors.warning,
    bg: "rgba(245,158,11,0.1)",
  },
  app_banned: { label: "Banido", color: colors.error, bg: "rgba(239,68,68,0.1)" },
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "none", label: "Normal" },
  { key: "comment_blocked", label: "Sem comentários" },
  { key: "app_banned", label: "Banido" },
];

const SEARCH_DEBOUNCE_MS = 250;

/* ── Props ─────────────────────────────────────────────────────── */

interface ModerationScreenProps {
  onBack: () => void;
  viewerRoles: string[];
}

/* ── Component ─────────────────────────────────────────────────── */

export function ModerationScreen({ onBack, viewerRoles }: ModerationScreenProps) {
  const dialog = useDialog();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [items, setItems] = useState<ModeratedUser[]>([]);
  const [screenState, setScreenState] = useState<ScreenState>("idle");

  const [actionSheetUser, setActionSheetUser] = useState<ModeratedUser | null>(null);
  const [pendingRestrict, setPendingRestrict] = useState<PendingRestrict | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  const isOwner = viewerRoles.includes("owner");
  const canBan = isOwner || viewerRoles.includes("assistant");

  /* ── Search ── */

  const fetchResults = useCallback(
    async (q: string, status: StatusFilter, opts?: { silent?: boolean }) => {
      const seq = ++requestSeq.current;
      if (!opts?.silent) setScreenState("loading");
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        if (status) params.set("status", status);
        const res = await api.get<{ items: ModeratedUser[] }>(
          `/moderation/users?${params.toString()}`,
        );
        if (seq !== requestSeq.current) return; // stale response — a newer search superseded this one
        setItems(res.items);
        setScreenState("loaded");
      } catch {
        if (seq !== requestSeq.current) return;
        if (!opts?.silent) setScreenState("error");
        // silent (post-action) refresh failures keep the current list on screen
      }
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      requestSeq.current++; // invalidate any in-flight fetch
      setItems([]);
      setScreenState("idle");
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchResults(trimmed, statusFilter);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, statusFilter, fetchResults]);

  const handleRetry = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    void fetchResults(trimmed, statusFilter);
  }, [query, statusFilter, fetchResults]);

  const refreshSilently = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    void fetchResults(trimmed, statusFilter, { silent: true });
  }, [query, statusFilter, fetchResults]);

  /* ── Contextual actions ── */

  function getActions(user: ModeratedUser): RowAction[] {
    if (user.isStaff && !isOwner) return [];

    const actions: RowAction[] = [];
    if (user.level === "none") {
      actions.push({
        key: "block_comments",
        label: "Bloquear comentários",
        icon: "message-square",
        kind: "restrict",
        level: "comment_blocked",
      });
      if (canBan) {
        actions.push({
          key: "ban_app",
          label: "Banir do app",
          icon: "slash",
          kind: "restrict",
          level: "app_banned",
          danger: true,
        });
      }
    } else if (user.level === "comment_blocked") {
      actions.push({
        key: "unblock_comments",
        label: "Liberar comentários",
        icon: "message-circle",
        kind: "lift",
      });
      if (canBan) {
        actions.push({
          key: "ban_app",
          label: "Banir do app",
          icon: "slash",
          kind: "restrict",
          level: "app_banned",
          danger: true,
        });
      }
    } else if (user.level === "app_banned" && canBan) {
      actions.push({
        key: "unban_app",
        label: "Desbanir",
        icon: "unlock",
        kind: "lift",
      });
    }
    return actions;
  }

  function handleRowPress(user: ModeratedUser) {
    if (user.isStaff && !isOwner) return; // backend would 403 — keep the UI honest
    setActionSheetUser(user);
  }

  /* ── Restrict (block comments / ban) — requires a reason ── */

  function handleActionPick(user: ModeratedUser, action: RowAction) {
    setActionSheetUser(null);
    if (action.kind === "restrict" && action.level) {
      setPendingRestrict({ user, level: action.level });
      return;
    }
    void handleLift(user);
  }

  async function submitRestrict(reason: string) {
    if (!pendingRestrict) return;
    const { user, level } = pendingRestrict;
    setPendingRestrict(null);
    setActionLoading(user.uid);
    try {
      await api.post(`/moderation/${user.uid}`, { level, reason });
      refreshSilently();
    } catch (err) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao aplicar moderação.",
        tone: "danger",
      });
    } finally {
      setActionLoading(null);
    }
  }

  /* ── Lift (liberar comentários / desbanir) — confirm, no reason ── */

  async function handleLift(user: ModeratedUser) {
    const isBan = user.level === "app_banned";
    const ok = await dialog.confirm({
      title: isBan ? "Desbanir usuário" : "Liberar comentários",
      message: isBan
        ? `Remover o banimento de ${user.name}?`
        : `Liberar os comentários de ${user.name}?`,
      confirmText: isBan ? "Desbanir" : "Liberar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    setActionLoading(user.uid);
    try {
      await api.delete(`/moderation/${user.uid}`);
      refreshSilently();
    } catch (err) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao remover moderação.",
        tone: "danger",
      });
    } finally {
      setActionLoading(null);
    }
  }

  /* ── Render ── */

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moderação</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar usuário pelo nome..."
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = statusFilter === key;
          return (
            <TouchableOpacity
              key={key || "all"}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatusFilter(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Body */}
      {screenState === "idle" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="search" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Buscar usuário</Text>
          <Text style={styles.emptyMsg}>
            Digite um nome acima para localizar um usuário e aplicar ou remover moderação.
          </Text>
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
          <Text style={styles.emptyMsg}>Não foi possível buscar os usuários.</Text>
          <View style={styles.stateAction}>
            <Button label="Tentar novamente" onPress={handleRetry} />
          </View>
        </View>
      )}

      {screenState === "loaded" && items.length === 0 && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="users" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
          <Text style={styles.emptyMsg}>Tente outro nome ou ajuste o filtro de status.</Text>
        </View>
      )}

      {screenState === "loaded" && items.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.countLabel}>
            {items.length} usuário{items.length !== 1 ? "s" : ""} encontrado
            {items.length !== 1 ? "s" : ""}
          </Text>

          {items.map((user) => {
            const meta = LEVEL_META[user.level];
            const locked = user.isStaff && !isOwner;
            const isActing = actionLoading === user.uid;

            return (
              <TouchableOpacity
                key={user.uid}
                style={[styles.row, locked && styles.rowLocked]}
                onPress={() => handleRowPress(user)}
                activeOpacity={locked ? 1 : 0.7}
                disabled={isActing}
              >
                <UserAvatar name={user.name} photoUrl={user.photoUrl} size={40} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{user.name}</Text>
                  <Text style={styles.rowRole}>
                    {user.roleLabel}
                    {user.isStaff ? " · Equipe" : ""}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  {isActing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusChipText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>
                      {locked ? (
                        <Feather name="lock" size={16} color={colors.mutedForeground} />
                      ) : (
                        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                      )}
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Action sheet */}
      <Modal
        visible={actionSheetUser !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActionSheetUser(null)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setActionSheetUser(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {actionSheetUser && (
              <>
                <View style={styles.sheetHeader}>
                  <UserAvatar
                    name={actionSheetUser.name}
                    photoUrl={actionSheetUser.photoUrl}
                    size={36}
                  />
                  <View style={styles.sheetHeaderInfo}>
                    <Text style={styles.sheetHeaderName}>{actionSheetUser.name}</Text>
                    <Text style={styles.sheetHeaderRole}>{actionSheetUser.roleLabel}</Text>
                  </View>
                </View>

                {getActions(actionSheetUser).length === 0 ? (
                  <Text style={styles.sheetEmptyText}>
                    Nenhuma ação de moderação disponível para o seu perfil.
                  </Text>
                ) : (
                  getActions(actionSheetUser).map((action) => (
                    <TouchableOpacity
                      key={action.key}
                      style={styles.sheetAction}
                      onPress={() => handleActionPick(actionSheetUser, action)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={action.icon}
                        size={18}
                        color={action.danger ? colors.error : colors.foreground}
                      />
                      <Text
                        style={[
                          styles.sheetActionText,
                          action.danger && styles.sheetActionTextDanger,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}

                <TouchableOpacity
                  style={styles.sheetCancel}
                  onPress={() => setActionSheetUser(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sheetCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Reason prompt (bloquear comentários / banir do app) */}
      <ReasonPrompt
        visible={pendingRestrict !== null}
        title={
          pendingRestrict?.level === "app_banned"
            ? `Banir ${pendingRestrict.user.name}`
            : `Bloquear comentários de ${pendingRestrict?.user.name ?? ""}`
        }
        confirmText={pendingRestrict?.level === "app_banned" ? "Banir" : "Bloquear"}
        onCancel={() => setPendingRestrict(null)}
        onSubmit={(reason) => void submitRestrict(reason)}
      />
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

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
  },

  chipScroll: {
    marginTop: spacing.sm + 4,
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
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

  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  stateAction: {
    width: "100%",
    marginTop: spacing.xl,
  },

  countLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginBottom: spacing.md,
  },

  // Result row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  rowLocked: {
    opacity: 0.55,
  },
  rowInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  rowName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
  },
  rowRole: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  statusChipText: {
    fontFamily: typography.fontBodyMedium,
    fontSize: 11,
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

  // Action sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingBottom: spacing.md,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetHeaderInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sheetHeaderName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
  },
  sheetHeaderRole: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  sheetEmptyText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingVertical: spacing.md,
  },
  sheetActionText: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
  sheetActionTextDanger: {
    color: colors.error,
  },
  sheetCancel: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetCancelText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
});
