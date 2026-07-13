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

function renderText(text: string) {
  // destaca tokens @palavra em dourado
  const parts = text.split(/(@[\p{L}\d]+)/u);
  return parts.map((p, i) =>
    p.startsWith("@")
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
        <Text style={styles.text}>{renderText(comment.text)}</Text>
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
