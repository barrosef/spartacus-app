// src/components/timeline/comments/CommentsSection.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { api } from "../../../lib/api";
import { auth } from "../../../lib/firebase";
import { useDialog } from "../../ui/DialogProvider";
import { Button } from "../../ui/Button";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { RemoveCommentDialog, type ModerationLevel } from "./RemoveCommentDialog";
import type { Comment, CommentsPage } from "./types";

// Comentários de topo exibidos por página de revelação ("Ver mais").
const TOPS_PAGE = 5;

interface Props {
  entryId: string;
  canModerate: boolean;
  viewerRoles?: string[];
  onCountChange?: (delta: number) => void;
}

type Screen = "loading" | "loaded" | "error";

export function CommentsSection({
  entryId, canModerate, viewerRoles = [], onCountChange,
}: Props) {
  const dialog = useDialog();
  const currentUid = auth.currentUser?.uid ?? "";
  const [screen, setScreen] = useState<Screen>("loading");
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; display: string } | null>(null);
  const [visibleTops, setVisibleTops] = useState(TOPS_PAGE);
  const [removeTarget, setRemoveTarget] = useState<Comment | null>(null);

  const canBanApp = viewerRoles.some((r) => r === "owner" || r === "assistant");

  const load = useCallback(async (silent = false) => {
    if (!silent) setScreen("loading");
    try {
      const res = await api.get<CommentsPage>(`/timeline/${entryId}/comments`);
      setComments(res?.items ?? []);
      setScreen("loaded");
    } catch { setScreen("error"); }
  }, [entryId]);

  useEffect(() => { load(); }, [load]);

  // Agrupamento 1-nível em ordem cronológica; corte por comentários de topo:
  // mostra os `visibleTops` mais recentes (fim da lista) com suas respostas;
  // "Ver mais" revela +TOPS_PAGE topos anteriores até esgotar.
  const tops = comments.filter((c) => !c.parentId);
  const shownTops = tops.slice(Math.max(0, tops.length - visibleTops));
  const hiddenTops = tops.length - shownTops.length;
  const rows: { comment: Comment; isReply: boolean }[] = [];
  for (const t of shownTops) {
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

  const edit = async (c: Comment, newText: string) => {
    try {
      await api.patch(`/timeline/${entryId}/comments/${c.id}`, {
        text: newText,
        mentions: c.mentions,
      });
      await load(true);
    } catch (err: unknown) {
      dialog.alert({ title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível editar.",
        tone: "danger" });
      throw err;   // mantém o editor in-place aberto no CommentItem
    }
  };

  const doDelete = async (c: Comment): Promise<boolean> => {
    try {
      await api.delete(`/timeline/${entryId}/comments/${c.id}`);
      onCountChange?.(-1);
      await load(true);
      return true;
    } catch (err: unknown) {
      dialog.alert({ title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível remover.",
        tone: "danger" });
      return false;
    }
  };

  const requestRemove = async (c: Comment) => {
    if (c.authorUid === currentUid) {
      // Próprio comentário (staff incluso): confirmação simples, sem toggles
      // de restrição (spec 2026-07-16).
      const ok = await dialog.confirm({ title: "Remover comentário",
        message: "Tem certeza que deseja remover?", tone: "danger",
        confirmText: "Remover" });
      if (ok) await doDelete(c);
      return;
    }
    // Staff removendo comentário de terceiro → modal unificada com toggles.
    setRemoveTarget(c);
  };

  const confirmRemove = async (
    restrict: { level: ModerationLevel; reason: string } | null,
  ) => {
    const target = removeTarget;
    setRemoveTarget(null);
    if (!target) return;
    const deleted = await doDelete(target);
    if (!deleted || !restrict) return;
    try {
      await api.post(`/moderation/${target.authorUid}`, restrict);
      dialog.alert({
        title: "Restrição aplicada",
        message: restrict.level === "app_banned"
          ? `${target.authorName} foi banido do app.`
          : `${target.authorName} não poderá mais comentar.`,
        tone: "success",
      });
    } catch (err: unknown) {
      dialog.alert({ title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível aplicar a restrição.",
        tone: "danger" });
    }
  };

  return (
    <View style={styles.container}>
      {screen === "loading" ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : screen === "error" ? (
        <View style={styles.center}>
          <Text style={styles.errTxt}>Não foi possível carregar.</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Button label="Tentar novamente" onPress={() => load()} />
          </View>
        </View>
      ) : (
        <>
          {hiddenTops > 0 ? (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => setVisibleTops((v) => v + TOPS_PAGE)}
              activeOpacity={0.7}
            >
              <Text style={styles.moreTxt}>Ver mais ({hiddenTops})</Text>
            </TouchableOpacity>
          ) : null}
          {rows.length === 0 ? (
            <Text style={styles.empty}>Seja o primeiro a comentar.</Text>
          ) : (
            rows.map(({ comment, isReply }) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isReply={isReply}
                currentUid={currentUid}
                canModerate={canModerate}
                onReply={(c) => setReplyingTo({ commentId: c.parentId ?? c.id, display: c.authorName })}
                onEdit={edit}
                onDelete={requestRemove}
              />
            ))
          )}
        </>
      )}

      <CommentInput
        entryId={entryId}
        replyingTo={replyingTo}
        onSubmit={submit}
        onCancelReply={() => setReplyingTo(null)}
      />

      <RemoveCommentDialog
        visible={removeTarget !== null}
        authorName={removeTarget?.authorName ?? ""}
        canBanApp={canBanApp}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={(r) => void confirmRemove(r)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Painel colado ao card (que tem marginBottom: spacing.md) — o marginTop
  // negativo aproxima a seção para ler como extensão do card expandido.
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  errTxt: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14 },
  empty: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14,
    textAlign: "center", padding: spacing.md },
  moreBtn: { paddingVertical: spacing.sm, alignItems: "center" },
  moreTxt: { color: colors.primary, fontFamily: typography.fontBodyMedium, fontSize: 13 },
});
