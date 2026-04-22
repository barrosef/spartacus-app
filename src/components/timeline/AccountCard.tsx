import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { timeAgo } from "../../utils/timeAgo";
import { UserAvatar } from "../ui/UserAvatar";
import type { TimelineEntry } from "./types";

interface AccountCardProps {
  entry: TimelineEntry;
}

export function AccountCard({ entry }: AccountCardProps) {
  const targetName = entry.targetName ?? entry.authorName;
  const classes = entry.classes ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Feather name="user-plus" size={16} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Nova conta criada</Text>
          <View style={styles.userRow}>
            <UserAvatar
              name={targetName}
              photoUrl={entry.targetPhotoUrl ?? entry.authorPhotoUrl}
              size={28}
            />
            <Text style={styles.name} numberOfLines={1}>
              {targetName}
            </Text>
          </View>

          {entry.rolesLabel && (
            <View style={styles.metaRow}>
              <Feather
                name="tag"
                size={11}
                color={colors.mutedForeground}
                style={styles.metaIcon}
              />
              <Text style={styles.metaText}>{entry.rolesLabel}</Text>
            </View>
          )}

          {classes.length > 0 && (
            <View style={styles.metaRow}>
              <Feather
                name="bookmark"
                size={11}
                color={colors.mutedForeground}
                style={styles.metaIcon}
              />
              <Text style={styles.metaText} numberOfLines={2}>
                {classes.join(" · ")}
              </Text>
            </View>
          )}

          {entry.guardianName && (
            <View style={styles.metaRow}>
              <Feather
                name="shield"
                size={11}
                color={colors.mutedForeground}
                style={styles.metaIcon}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                Responsável: {entry.guardianName}
              </Text>
            </View>
          )}

          <Text style={styles.time}>{timeAgo(entry.createdAt)}</Text>
        </View>
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
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: colors.white,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 11,
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    opacity: 0.8,
  },
  metaText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    flex: 1,
  },
  time: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },
});
