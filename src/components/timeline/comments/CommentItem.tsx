// src/components/timeline/comments/CommentItem.tsx
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../../theme/tokens";
import type { Comment } from "./types";

interface Props {
  comment: Comment;
  isReply?: boolean;
  canModerate: boolean;
  onReply: (c: Comment) => void;
  onDelete: (c: Comment) => void;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderText(text: string, mentionDisplays: string[] = []) {
  // Destaca menções em dourado. Primeiro casa os displays conhecidos (podem
  // ter espaços, ex.: "@João da Silva Sauro"), do mais longo ao mais curto;
  // depois um token "@palavra" como fallback (comentários legados sem
  // mentionDisplays). Sem os displays, um "@" seguido de nome composto só
  // destacaria o primeiro nome.
  const tokens = [...mentionDisplays]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((d) => `@${escapeRegExp(d)}`);
  const re = new RegExp(`(${[...tokens, "@[\\p{L}\\d]+"].join("|")})`, "u");
  return text.split(re).map((p, i) =>
    p && p.startsWith("@")
      ? <Text key={i} style={styles.mention}>{p}</Text>
      : <Text key={i}>{p}</Text>);
}

export function CommentItem({ comment, isReply, canModerate, onReply, onDelete }: Props) {
  const initials = (comment.authorName.trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]).join("") || "?").toUpperCase();

  if (comment.deleted) {
    return <View style={[styles.row, isReply && styles.reply]}>
      <Text style={styles.removed}>⌀ comentário removido pela equipe</Text>
    </View>;
  }
  return (
    <View style={[styles.row, isReply && styles.reply]}>
      {comment.authorPhotoUrl
        ? <Image source={{ uri: comment.authorPhotoUrl }} style={styles.avatar} />
        : <View style={styles.initials}><Text style={styles.initialsTxt}>{initials}</Text></View>}
      <View style={{ flex: 1 }}>
        <Text style={styles.author}>{comment.authorName}</Text>
        <Text style={styles.text}>{renderText(comment.text, comment.mentionDisplays)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onReply(comment)}>
            <Text style={styles.action}>Responder</Text>
          </TouchableOpacity>
          {canModerate ? (
            <TouchableOpacity onPress={() => onDelete(comment)}>
              <Text style={[styles.action, { color: colors.error }]}>Remover</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md },
  reply: { paddingLeft: spacing.xl },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  initials: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryMuted,
    alignItems: "center", justifyContent: "center" },
  initialsTxt: { color: colors.primary, fontFamily: typography.fontBodySemiBold, fontSize: 13 },
  author: { color: colors.foreground, fontFamily: typography.fontBodySemiBold, fontSize: 13 },
  text: { color: colors.foreground, fontFamily: typography.fontBody, fontSize: 14, marginTop: 2 },
  mention: { color: colors.primary, fontFamily: typography.fontBodySemiBold },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: 4 },
  action: { color: colors.mutedForeground, fontFamily: typography.fontBodyMedium, fontSize: 12 },
  removed: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 13,
    fontStyle: "italic", paddingVertical: spacing.sm },
});
