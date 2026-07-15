// src/components/timeline/comments/CommentsSheet.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Modal, FlatList, ActivityIndicator, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { useDialog } from "../../ui/DialogProvider";
import { Button } from "../../ui/Button";
import { ReasonPrompt } from "../../staff/ReasonPrompt";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import type { Comment, CommentsPage } from "./types";

interface Props {
  entryId: string;
  visible: boolean;
  canModerate: boolean;
  viewerRoles?: string[];
  onClose: () => void;
  onCountChange?: (delta: number) => void;
}
type Row = { comment: Comment; isReply: boolean };
type Screen = "loading" | "loaded" | "error";
type ModerationLevel = "comment_blocked" | "app_banned";

export function CommentsSheet({
  entryId,
  visible,
  canModerate,
  viewerRoles = [],
  onClose,
  onCountChange,
}: Props) {
  const dialog = useDialog();
  const [screen, setScreen] = useState<Screen>("loading");
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; display: string } | null>(null);

  // Post-removal "restrict author?" flow — independent of the comment
  // deletion itself, which has already completed by the time these open.
  const [restrictTarget, setRestrictTarget] = useState<Comment | null>(null);
  const [pendingRestrict, setPendingRestrict] = useState<{
    comment: Comment;
    level: ModerationLevel;
  } | null>(null);

  const canBanApp = viewerRoles.some((r) => r === "owner" || r === "assistant");

  const load = useCallback(async (silent = false) => {
    if (!silent) setScreen("loading");
    try {
      const res = await api.get<CommentsPage>(`/timeline/${entryId}/comments`);
      setComments(res?.items ?? []);
      setScreen("loaded");
    } catch { setScreen("error"); }
  }, [entryId]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  // Agrupamento 1-nível: topo em ordem; respostas logo após seu pai.
  const rows: Row[] = [];
  const tops = comments.filter((c) => !c.parentId);
  for (const t of tops) {
    rows.push({ comment: t, isReply: false });
    comments.filter((c) => c.parentId === t.id)
      .forEach((r) => rows.push({ comment: r, isReply: true }));
  }

  const submit = async (text: string, parentId: string | null, mentions: string[]) => {
    try {
      await api.post(`/timeline/${entryId}/comments`, { text, parentId, mentions });
      onCountChange?.(1);
      setReplyingTo(null);
      await load(true);
    } catch (err: unknown) {
      dialog.alert({ title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível comentar.",
        tone: "danger" });
    }
  };

  const remove = async (c: Comment) => {
    const ok = await dialog.confirm({ title: "Remover comentário",
      message: "Tem certeza que deseja remover?", tone: "danger",
      confirmText: "Remover" });
    if (!ok) return;
    try {
      await api.delete(`/timeline/${entryId}/comments/${c.id}`);
      onCountChange?.(-1);
      await load(true);
      // Removal succeeded — offer to restrict the author. This step is
      // independent: dismissing it must not undo the deletion above.
      if (canModerate) setRestrictTarget(c);
    } catch (err: unknown) {
      dialog.alert({ title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível remover.",
        tone: "danger" });
    }
  };

  const pickRestrictLevel = (level: ModerationLevel) => {
    if (!restrictTarget) return;
    setPendingRestrict({ comment: restrictTarget, level });
    setRestrictTarget(null);
  };

  const submitRestrict = async (reason: string) => {
    if (!pendingRestrict) return;
    const { comment, level } = pendingRestrict;
    setPendingRestrict(null);
    try {
      await api.post(`/moderation/${comment.authorUid}`, { level, reason });
      dialog.alert({
        title: "Restrição aplicada",
        message:
          level === "app_banned"
            ? `${comment.authorName} foi banido do app.`
            : `${comment.authorName} não poderá mais comentar.`,
        tone: "success",
      });
    } catch (err: unknown) {
      dialog.alert({
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível aplicar a restrição.",
        tone: "danger",
      });
    }
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Comentários</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>

          {screen === "loading" ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : screen === "error" ? (
            <View style={styles.center}>
              <Text style={styles.errTxt}>Não foi possível carregar.</Text>
              <View style={{ marginTop: spacing.md }}>
                <Button label="Tentar novamente" onPress={() => load()} />
              </View>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(r) => r.comment.id}
              renderItem={({ item }) => (
                <CommentItem comment={item.comment} isReply={item.isReply}
                  canModerate={canModerate}
                  onReply={(c) => setReplyingTo({ commentId: c.parentId ?? c.id, display: c.authorName })}
                  onDelete={remove} />
              )}
              ListEmptyComponent={<Text style={styles.empty}>Seja o primeiro a comentar.</Text>}
              contentContainerStyle={rows.length ? undefined : styles.center}
            />
          )}

          <CommentInput entryId={entryId} replyingTo={replyingTo}
            onSubmit={submit} onCancelReply={() => setReplyingTo(null)} />
        </View>
      </View>
    </Modal>

    {/* Restrict-author selection — shown after a successful removal, staff only */}
    <Modal
      visible={restrictTarget !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setRestrictTarget(null)}
    >
      <TouchableWithoutFeedback onPress={() => setRestrictTarget(null)}>
        <View style={styles.restrictOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.restrictCard}>
              <Text style={styles.restrictTitle}>Comentário removido</Text>
              <Text style={styles.restrictMsg}>
                Deseja também restringir {restrictTarget?.authorName}?
              </Text>

              <TouchableOpacity
                style={styles.restrictAction}
                onPress={() => pickRestrictLevel("comment_blocked")}
                activeOpacity={0.7}
              >
                <Feather name="message-square" size={18} color={colors.foreground} />
                <Text style={styles.restrictActionText}>Bloquear comentários</Text>
              </TouchableOpacity>

              {canBanApp && (
                <TouchableOpacity
                  style={styles.restrictAction}
                  onPress={() => pickRestrictLevel("app_banned")}
                  activeOpacity={0.7}
                >
                  <Feather name="slash" size={18} color={colors.error} />
                  <Text style={[styles.restrictActionText, styles.restrictActionTextDanger]}>
                    Banir do app
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.restrictCancel}
                onPress={() => setRestrictTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.restrictCancelText}>Agora não</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>

    <ReasonPrompt
      visible={pendingRestrict !== null}
      title={
        pendingRestrict?.level === "app_banned"
          ? `Banir ${pendingRestrict.comment.authorName}`
          : `Bloquear comentários de ${pendingRestrict?.comment.authorName ?? ""}`
      }
      confirmText={pendingRestrict?.level === "app_banned" ? "Banir" : "Bloquear"}
      onCancel={() => setPendingRestrict(null)}
      onSubmit={(reason) => void submitRestrict(reason)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { height: "80%", backgroundColor: colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.foreground, fontFamily: typography.fontHeadingSemi, fontSize: 17 },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errTxt: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14 },
  empty: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14, textAlign: "center" },

  restrictOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  restrictCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  restrictTitle: {
    fontSize: 18,
    fontFamily: typography.fontHeadingSemi,
    color: colors.foreground,
    textAlign: "center",
  },
  restrictMsg: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  restrictAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  restrictActionText: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
  restrictActionTextDanger: {
    color: colors.error,
  },
  restrictCancel: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  restrictCancelText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
});
