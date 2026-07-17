import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { timeAgo } from "../../utils/timeAgo";
import { formatRoles } from "./helpers";
import { AttachmentList } from "./AttachmentList";
import { UserAvatar } from "../ui/UserAvatar";
import type { TimelineEntry } from "./types";
import { useMemo, useState } from "react";
import { canShareExternally } from "../../lib/share/platform";
import { buildCaption } from "../../lib/share/buildCaption";
import { shareMedia } from "../../lib/share/shareMedia";
import { ShareSheet } from "./ShareSheet";
import { useDialog } from "../ui/DialogProvider";

const LIKE_COLOR = "#ef4444";

/** ISO-8601 → "DD/MM/AAAA [HH:mm]"; falls back to the raw value. */
function formatEventDate(raw?: string | null): string {
  if (!raw) return "";
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
  );
  if (!match) return raw;
  const [, y, m, d, hh, mm] = match;
  const time = hh && mm && !(hh === "00" && mm === "00") ? ` ${hh}:${mm}` : "";
  return `${d}/${m}/${y}${time}`;
}

interface PostCardProps {
  entry: TimelineEntry;
  isSocial?: boolean;
  commentsCount: number;
  commentsOpen: boolean;
  commentsSection?: React.ReactNode;
  onLike: () => void;
  onViewLikes: () => void;
  onToggleComments: () => void;
  onPin?: () => void;
}

export function PostCard({
  entry,
  isSocial = false,
  commentsCount,
  commentsOpen,
  commentsSection,
  onLike,
  onViewLikes,
  onToggleComments,
  onPin,
}: PostCardProps) {
  const isEvent = entry.type === "event" || entry.type === "championship";

  const dialog = useDialog();
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  // Memoized so a re-render of the card (e.g. comment/like state) doesn't hand
  // the ShareSheet a new array identity mid-selection — which would reset its
  // marks. Stable as long as entry.attachments is stable.
  const images = useMemo(
    () => (entry.attachments ?? []).filter((a) => a.type === "image"),
    [entry.attachments],
  );
  const canShare = canShareExternally && images.length > 0;

  const runShare = async (urls: string[]) => {
    try {
      await shareMedia({ urls, caption: buildCaption(entry) });
    } catch {
      const retry = await dialog.confirm({
        title: "Não foi possível preparar a imagem",
        message: "Verifique sua conexão e tente novamente.",
        confirmText: "Tentar de novo",
        tone: "danger",
      });
      if (retry) await runShare(urls);
    }
  };

  const handleSharePress = () => {
    if (images.length === 1) {
      runShare([images[0].url]);
    } else {
      setShareSheetOpen(true);
    }
  };

  return (
    <View style={[styles.card, entry.isPinned && styles.cardPinned]}>
      {/* Pinned badge — visible to everyone */}
      {entry.isPinned ? (
        <View style={styles.pinnedBadge}>
          <MaterialCommunityIcons name="pin" size={13} color={colors.primary} />
          <Text style={styles.pinnedText}>Fixado</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.header}>
        <UserAvatar
          name={entry.authorName}
          photoUrl={entry.authorPhotoUrl}
          size={40}
        />
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
            {[formatEventDate(entry.eventDate), entry.eventLocation]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ) : null}

      {/* Attachments: image / audio / file — rendered per type */}
      {entry.attachments && entry.attachments.length > 0 ? (
        <AttachmentList attachments={entry.attachments} />
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
            <Ionicons
              name={entry.userLiked ? "heart" : "heart-outline"}
              size={20}
              color={entry.userLiked ? LIKE_COLOR : colors.mutedForeground}
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
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onToggleComments}
            activeOpacity={0.7}
          >
            <Feather
              name="message-circle"
              size={20}
              color={commentsOpen ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          {commentsCount > 0 ? (
            <Text style={styles.likesCount}>{commentsCount}</Text>
          ) : null}
          {canShare ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSharePress}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
        {isSocial ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onPin}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={entry.isPinned ? "pin" : "pin-outline"}
              size={20}
              color={entry.isPinned ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {canShare ? (
        <ShareSheet
          images={images}
          visible={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          onConfirm={(urls) => {
            setShareSheetOpen(false);
            runShare(urls);
          }}
        />
      ) : null}

      {/* Comentários inline — parte do próprio card */}
      {commentsSection}
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
  cardPinned: {
    borderColor: colors.primary,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: -spacing.xs,
  },
  pinnedText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    color: LIKE_COLOR,
    fontFamily: typography.fontBodySemiBold,
  },
});
