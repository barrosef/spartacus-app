import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";

interface AppHeaderProps {
  subtitle: string;
  userInitials: string;
  photoUrl?: string | null;
  onProfilePress: () => void;
  onMenuPress: () => void;
  onFilterPress?: () => void;
  filterActive?: boolean;
  onBellPress?: () => void;
  unreadCount?: number;
}

export function AppHeader({
  subtitle,
  userInitials,
  photoUrl,
  onProfilePress,
  onMenuPress,
  onFilterPress,
  filterActive = false,
  onBellPress,
  unreadCount = 0,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Left: hamburger */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        onPress={onMenuPress}
      >
        <Feather name="menu" size={24} color={colors.foreground} />
      </TouchableOpacity>

      {/* Center: title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>SPARTACUS</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Right: filter (optional) + bell + profile */}
      <View style={styles.right}>
        {onFilterPress && (
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={onFilterPress}
          >
            <Feather
              name="sliders"
              size={22}
              color={filterActive ? colors.primary : colors.foreground}
            />
            {filterActive && <View style={styles.filterDot} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={onBellPress}
        >
          <Feather name="bell" size={24} color={colors.foreground} />
          {unreadCount > 0 && <View style={styles.badge} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarBtn}
          activeOpacity={0.8}
          onPress={onProfilePress}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  iconBtn: {
    position: "relative",
    padding: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    color: colors.primary,
    fontFamily: typography.fontHeading,
    fontSize: 20,
    letterSpacing: 2,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatarBtn: {
    position: "relative",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(198,163,78,0.1)",
    borderWidth: 2,
    borderColor: "rgba(198,163,78,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(198,163,78,0.5)",
  },
  avatarText: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.background,
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
