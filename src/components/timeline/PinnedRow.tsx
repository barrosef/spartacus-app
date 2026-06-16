import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";
import type { TimelineEntry } from "./types";

interface PinnedRowProps {
  entry: TimelineEntry;
  onPress: () => void;
}

/**
 * WhatsApp-style single-line bar for the pinned entry. Sits above the feed;
 * tapping it scrolls the timeline to the original card (handled by the parent).
 */
export function PinnedRow({ entry, onPress }: PinnedRowProps) {
  const snippet = entry.title || entry.description || "Publicação fixada";
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <MaterialCommunityIcons name="pin" size={16} color={colors.primary} />
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.author}>{entry.authorName}: </Text>
        {snippet}
      </Text>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    flex: 1,
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  author: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
  },
});
