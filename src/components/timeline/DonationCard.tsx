import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { timeAgo } from "../../utils/timeAgo";
import { getInitials, avatarColor, formatRoles } from "./helpers";
import { ValidationBadge } from "./ValidationBadge";
import type { TimelineEntry } from "./types";

interface DonationCardProps {
  entry: TimelineEntry;
  isStaff: boolean;
  isTarget: boolean;
  onConfirm: () => void;
  onAbsent: () => void;
  onRequestReview: () => void;
}

function formatReference(isoDate: string): string {
  const date = new Date(isoDate);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${year}`;
}

export function DonationCard({
  entry,
  isStaff,
  isTarget,
  onConfirm,
  onAbsent,
  onRequestReview,
}: DonationCardProps) {
  const targetName = entry.targetName ?? entry.authorName;
  const targetRoles = entry.targetName ? ["supporter"] : entry.authorRoles;
  const bgColor = avatarColor(targetName);

  const canRequestReview =
    isTarget &&
    entry.validationStatus === "absent" &&
    !entry.reviewRequested;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>{getInitials(targetName)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {targetName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatRoles(targetRoles)} · {timeAgo(entry.createdAt)}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.bodyRow}>
        <Feather name="gift" size={16} color={colors.primary} />
        <Text style={styles.body}>
          Registrou doacao:{" "}
          <Text style={styles.highlight}>
            {entry.donationAmount ?? "—"}
          </Text>
          {" "}(Referencia: {formatReference(entry.createdAt)})
        </Text>
      </View>

      {/* Validation badge */}
      <ValidationBadge
        status={entry.validationStatus ?? null}
        reviewRequested={entry.reviewRequested ?? false}
        reviewResolved={entry.reviewResolved ?? false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {isStaff ? (
          <View style={styles.staffActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Feather name="thumbs-up" size={16} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>
                Confirmar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onAbsent}
              activeOpacity={0.7}
            >
              <Feather name="thumbs-down" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>
                Recusar
              </Text>
            </TouchableOpacity>
          </View>
        ) : canRequestReview ? (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={onRequestReview}
            activeOpacity={0.7}
          >
            <Feather
              name="alert-circle"
              size={14}
              color={colors.primary}
            />
            <Text style={styles.reviewText}>Solicitar revisao</Text>
          </TouchableOpacity>
        ) : null}

        {entry.likesCount > 0 ? (
          <View style={styles.likesRow}>
            <Feather name="heart" size={14} color={colors.mutedForeground} />
            <Text style={styles.likesCount}>{entry.likesCount}</Text>
          </View>
        ) : null}
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
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  body: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    fontFamily: typography.fontBodySemiBold,
    color: colors.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  staffActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
  },
  reviewText: {
    color: colors.primary,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: "auto",
  },
  likesCount: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
});
