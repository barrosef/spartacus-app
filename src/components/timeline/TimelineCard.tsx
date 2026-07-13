import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PostCard } from "./PostCard";
import { AttendanceCard } from "./AttendanceCard";
import { DonationCard } from "./DonationCard";
import { AccountCard } from "./AccountCard";
import { CommentsSheet } from "./comments/CommentsSheet";
import { colors, typography, spacing } from "../../theme/tokens";
import type { TimelineEntry } from "./types";

interface TimelineCardProps {
  entry: TimelineEntry;
  isStaff: boolean;
  isTarget: boolean;
  isSocial?: boolean;
  onLike: (entryId: string) => void;
  onViewLikes: (entryId: string) => void;
  onConfirm: (entryId: string) => void;
  onAbsent: (entryId: string) => void;
  onRequestReview: (entryId: string) => void;
  onPin?: (entryId: string) => void;
}

export function TimelineCard({
  entry,
  isStaff,
  isTarget,
  isSocial = false,
  onLike,
  onViewLikes,
  onConfirm,
  onAbsent,
  onRequestReview,
  onPin,
}: TimelineCardProps) {
  const [showComments, setShowComments] = useState(false);

  let card: React.ReactNode;
  switch (entry.type) {
    case "post":
    case "event":
    case "championship":
      card = (
        <PostCard
          entry={entry}
          isSocial={isSocial}
          onLike={() => onLike(entry.id)}
          onViewLikes={() => onViewLikes(entry.id)}
          onPin={() => onPin?.(entry.id)}
        />
      );
      break;

    case "attendance":
      card = (
        <AttendanceCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
        />
      );
      break;

    case "donation":
      card = (
        <DonationCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
        />
      );
      break;

    case "account_created":
      card = <AccountCard entry={entry} />;
      break;

    default:
      card = null;
  }

  if (card === null) return null;

  return (
    <View>
      {card}
      <TouchableOpacity
        style={styles.commentsRow}
        onPress={() => setShowComments(true)}
        activeOpacity={0.7}
      >
        <Feather name="message-circle" size={18} color={colors.mutedForeground} />
        <Text style={styles.commentsCount}>
          {entry.commentsCount ?? 0} comentário{entry.commentsCount === 1 ? "" : "s"}
        </Text>
      </TouchableOpacity>
      <CommentsSheet
        entryId={entry.id}
        visible={showComments}
        canModerate={isStaff}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  commentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  commentsCount: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
});
