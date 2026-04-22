import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../theme/tokens";
import {
  avatarColor,
  getInitials,
} from "../timeline/helpers";

interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
}

/**
 * Circular user avatar: photo when available, initials fallback otherwise.
 * Single place to own this pattern — adopt across cards, lists and modals.
 */
export function UserAvatar({ name, photoUrl, size = 36 }: UserAvatarProps) {
  const dimensions = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={dimensions} />;
  }

  const bgColor = avatarColor(name);
  const fontSize = Math.max(10, Math.round(size * 0.36));
  return (
    <View style={[styles.base, dimensions, { backgroundColor: bgColor }]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.white,
    fontFamily: typography.fontHeadingSemi,
  },
});
