// src/components/timeline/comments/CommentsSheet.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Modal, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { useDialog } from "../../ui/DialogProvider";
import { Button } from "../../ui/Button";
import { colors, typography, spacing } from "../../../theme/tokens";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import type { Comment, CommentsPage } from "./types";

interface Props {
  entryId: string;
  visible: boolean;
  canModerate: boolean;
  onClose: () => void;
  onCountChange?: (delta: number) => void;
}
type Row = { comment: Comment; isReply: boolean };
type Screen = "loading" | "loaded" | "error";

export function CommentsSheet({ entryId, visible, canModerate, onClose, onCountChange }: Props) {
  const dialog = useDialog();
  const [screen, setScreen] = useState<Screen>("loading");
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; display: string } | null>(null);

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
    } catch (err: unknown) {
      dialog.alert({ title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível remover.",
        tone: "danger" });
    }
  };

  return (
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
});
