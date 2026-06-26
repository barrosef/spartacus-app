import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius, inputHeight } from "../../theme/tokens";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { AnamneseSummary, type AnamneseSummaryData } from "../../components/anamnese/AnamneseSummary";

/* ── Types ─────────────────────────────────────────────────────── */

interface PendingItem {
  uid: string;
  name: string;
  submittedAt?: string;
}

interface PendingListResponse {
  items: PendingItem[];
}

interface MedicalHistoryFull extends AnamneseSummaryData {
  status: string;
  reviewNote?: string | null;
}

type ListState = "loading" | "loaded" | "empty" | "error";
type DetailState = "loading" | "loaded" | "error";

/* ── Date helper ────────────────────────────────────────────────── */

function formatSubmittedAt(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
}

/* ── Props ──────────────────────────────────────────────────────── */

interface StaffAnamnesesScreenProps {
  onBack: () => void;
}

/* ── Component ─────────────────────────────────────────────────── */

export function StaffAnamnesesScreen({ onBack }: StaffAnamnesesScreenProps) {
  // List mode
  const [listState, setListState] = useState<ListState>("loading");
  const [items, setItems] = useState<PendingItem[]>([]);

  // Detail mode
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>("loading");
  const [detailData, setDetailData] = useState<MedicalHistoryFull | null>(null);

  // Review actions
  const [actionLoading, setActionLoading] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  /* ── Fetch list ── */

  const fetchList = useCallback(async () => {
    setListState("loading");
    try {
      const res = await api.get<PendingListResponse>("/medical-history/pending-review");
      setItems(res.items);
      setListState(res.items.length > 0 ? "loaded" : "empty");
    } catch {
      setListState("error");
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /* ── Fetch detail ── */

  const openDetail = useCallback(async (uid: string) => {
    setSelectedUid(uid);
    setDetailState("loading");
    setDetailData(null);
    setShowRevisionInput(false);
    setRevisionNote("");
    try {
      const res = await api.get<MedicalHistoryFull>(`/medical-history/${uid}`);
      setDetailData(res);
      setDetailState("loaded");
    } catch {
      setDetailState("error");
    }
  }, []);

  /* ── Back to list ── */

  const backToList = useCallback(() => {
    setSelectedUid(null);
    setDetailData(null);
    setShowRevisionInput(false);
    setRevisionNote("");
  }, []);

  /* ── Approve ── */

  const handleApprove = useCallback(async () => {
    if (!selectedUid) return;
    setActionLoading(true);
    try {
      await api.patch(`/medical-history/${selectedUid}/review`, { action: "approve" });
      backToList();
      fetchList();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao aprovar anamnese.";
      Alert.alert("Erro", message);
    } finally {
      setActionLoading(false);
    }
  }, [selectedUid, backToList, fetchList]);

  /* ── Request revision ── */

  const handleRequestRevision = useCallback(async () => {
    if (!selectedUid) return;
    const note = revisionNote.trim();
    if (!note) {
      Alert.alert("Campo obrigatório", "Informe o motivo da revisão antes de enviar.");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/medical-history/${selectedUid}/review`, {
        action: "request_revision",
        note,
      });
      backToList();
      fetchList();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao solicitar revisão.";
      Alert.alert("Erro", message);
    } finally {
      setActionLoading(false);
    }
  }, [selectedUid, revisionNote, backToList, fetchList]);

  /* ── Detail mode ── */

  if (selectedUid !== null) {
    const selectedName = items.find((i) => i.uid === selectedUid)?.name ?? "Anamnese";

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader title={selectedName} onBack={backToList} />

        {detailState === "loading" && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {detailState === "error" && (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Feather name="alert-circle" size={28} color={colors.error} />
            </View>
            <Text style={styles.emptyTitle}>Falha ao carregar</Text>
            <Text style={styles.emptyMsg}>
              Não foi possível buscar os dados da anamnese.
            </Text>
            <View style={styles.retryBtn}>
              <Button label="Tentar novamente" onPress={() => openDetail(selectedUid)} />
            </View>
          </View>
        )}

        {detailState === "loaded" && detailData !== null && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={styles.detailScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <AnamneseSummary data={detailData} />

              {/* Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.actionsSectionTitle}>Avaliação</Text>

                {/* Approve */}
                <Button
                  label="Aprovar"
                  variant="primary"
                  loading={actionLoading && !showRevisionInput}
                  disabled={actionLoading}
                  onPress={handleApprove}
                  style={styles.actionBtn}
                />

                {/* Pedir revisão toggle */}
                {!showRevisionInput ? (
                  <Button
                    label="Pedir revisão"
                    variant="outline"
                    disabled={actionLoading}
                    onPress={() => setShowRevisionInput(true)}
                    style={styles.actionBtn}
                  />
                ) : (
                  <View style={styles.revisionBlock}>
                    <Text style={styles.revisionLabel}>Motivo da revisão *</Text>
                    <TextInput
                      style={styles.revisionInput}
                      multiline
                      numberOfLines={4}
                      placeholder="Descreva o que precisa ser corrigido ou complementado…"
                      placeholderTextColor={colors.mutedForeground}
                      value={revisionNote}
                      onChangeText={setRevisionNote}
                      textAlignVertical="top"
                      editable={!actionLoading}
                    />
                    <View style={styles.revisionActions}>
                      <Button
                        label="Cancelar"
                        variant="ghost"
                        disabled={actionLoading}
                        onPress={() => {
                          setShowRevisionInput(false);
                          setRevisionNote("");
                        }}
                        style={styles.revisionCancelBtn}
                      />
                      <Button
                        label="Enviar revisão"
                        variant="outline"
                        loading={actionLoading}
                        disabled={actionLoading || revisionNote.trim().length === 0}
                        onPress={handleRequestRevision}
                        style={styles.revisionSubmitBtn}
                      />
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    );
  }

  /* ── List mode ── */

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Anamneses" onBack={onBack} />

      {listState === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {listState === "error" && (
        <>
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Feather name="alert-circle" size={28} color={colors.error} />
            </View>
            <Text style={styles.emptyTitle}>Falha ao carregar</Text>
            <Text style={styles.emptyMsg}>
              Não foi possível buscar as anamneses pendentes.
            </Text>
          </View>
          <View style={styles.footer}>
            <Button label="Tentar novamente" onPress={fetchList} />
          </View>
        </>
      )}

      {listState === "empty" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="check-circle" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma anamnese pendente</Text>
          <Text style={styles.emptyMsg}>
            Todas as anamneses foram avaliadas.
          </Text>
        </View>
      )}

      {listState === "loaded" && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countLabel}>
            {items.length} anamnese{items.length !== 1 ? "s" : ""} pendente{items.length !== 1 ? "s" : ""}
          </Text>

          {items.map((item) => {
            const formattedDate = formatSubmittedAt(item.submittedAt);
            return (
              <TouchableOpacity
                key={item.uid}
                style={styles.card}
                onPress={() => openDetail(item.uid)}
                activeOpacity={0.75}
              >
                <View style={styles.cardRow}>
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="file-text" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {formattedDate && (
                      <Text style={styles.cardMeta}>Enviada em {formattedDate}</Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ── Header ────────────────────────────────────────────────────── */

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={8}>
        <Feather name="chevron-left" size={24} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
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
  flex: {
    flex: 1,
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

  // List card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  cardRow: {
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
  cardMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },

  // Detail scroll
  detailScroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // Actions section
  actionsSection: {
    marginTop: spacing.sm,
    gap: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionsSectionTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  actionBtn: {
    width: "100%",
  },

  // Revision block
  revisionBlock: {
    gap: spacing.sm,
  },
  revisionLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 14,
  },
  revisionInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: inputHeight * 2,
  },
  revisionActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  revisionCancelBtn: {
    flex: 1,
  },
  revisionSubmitBtn: {
    flex: 2,
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
  retryBtn: {
    marginTop: spacing.lg,
    width: "100%",
  },
});
