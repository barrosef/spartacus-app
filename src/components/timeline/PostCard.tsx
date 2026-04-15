import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { timeAgo } from "../../utils/timeAgo";
import { getInitials, avatarColor, formatRoles } from "./helpers";
import type { TimelineEntry } from "./types";

interface PostCardProps {
  entry: TimelineEntry;
  onLike: () => void;
  onViewLikes: () => void;
}

export function PostCard({ entry, onLike, onViewLikes }: PostCardProps) {
  const bgColor = avatarColor(entry.authorName);
  const isEvent = entry.type === "event" || entry.type === "championship";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>
            {getInitials(entry.authorName)}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {entry.authorName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatRoles(entry.authorRoles)} · {timeAgo(entry.createdAt)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {entry.title ? (
          <Text style={styles.title}>{entry.title}</Text>
        ) : null}
        {entry.description ? (
          <Text style={styles.description}>{entry.description}</Text>
        ) : null}
      </View>

      {/* Event / Championship date + location */}
      {isEvent && (entry.eventDate || entry.eventLocation) ? (
        <View style={styles.eventRow}>
          <Feather name="calendar" size={14} color={colors.primary} />
          <Text style={styles.eventText}>
            {[entry.eventDate, entry.eventLocation]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ) : null}

      {/* First attachment image */}
      {entry.attachments && entry.attachments.length > 0 ? (
        <Image
          source={{ uri: entry.attachments[0].url }}
          style={styles.attachmentImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Link preview */}
      {entry.linkPreview ? (
        <View style={styles.linkPreview}>
          {entry.linkPreview.image ? (
            <Image
              source={{ uri: entry.linkPreview.image }}
              style={styles.linkImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle} numberOfLines={2}>
              {entry.linkPreview.title}
            </Text>
            {entry.linkPreview.description ? (
              <Text style={styles.linkDescription} numberOfLines={2}>
                {entry.linkPreview.description}
              </Text>
            ) : null}
            <Text style={styles.linkUrl} numberOfLines={1}>
              {entry.linkPreview.url}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onLike}
            activeOpacity={0.7}
          >
            <Feather
              name="heart"
              size={18}
              color={entry.userLiked ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          {entry.likesCount > 0 ? (
            <TouchableOpacity onPress={onViewLikes} activeOpacity={0.7}>
              <Text
                style={[
                  styles.likesCount,
                  entry.userLiked && styles.likesCountActive,
                ]}
              >
                {entry.likesCount}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Feather name="share-2" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm + 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  meta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    gap: spacing.xs,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  description: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 20,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
  },
  eventText: {
    color: colors.primary,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  attachmentImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.sm,
  },
  linkPreview: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  linkImage: {
    width: "100%",
    height: 140,
  },
  linkInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  linkTitle: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
  linkDescription: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    lineHeight: 17,
  },
  linkUrl: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  iconButton: {
    padding: spacing.xs,
  },
  likesCount: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  likesCountActive: {
    color: colors.primary,
  },
});
