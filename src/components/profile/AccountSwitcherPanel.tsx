import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";

export interface AccountOption {
  uid: string | null;
  name: string;
  photoUrl?: string | null;
  age?: number | null;
  isSelf?: boolean;
}

interface AccountSwitcherPanelProps {
  title?: string;
  options: AccountOption[];
  activeUid: string | null;
  onSelect: (opt: AccountOption) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AccountSwitcherPanel({
  title = "Trocar de conta",
  options,
  activeUid,
  onSelect,
}: AccountSwitcherPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      {options.map((opt, idx) => {
        const active = (opt.uid ?? null) === activeUid;
        return (
          <TouchableOpacity
            key={opt.uid ?? "self"}
            style={[
              styles.row,
              idx < options.length - 1 && styles.rowBorder,
              active && styles.rowActive,
            ]}
            activeOpacity={0.7}
            onPress={() => onSelect(opt)}
          >
            {opt.photoUrl ? (
              <Image source={{ uri: opt.photoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, opt.isSelf && styles.avatarSelf]}>
                <Text style={styles.avatarText}>{getInitials(opt.name)}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{opt.name}</Text>
              <Text style={styles.sub}>
                {opt.isSelf
                  ? "Meu perfil"
                  : opt.age != null
                    ? `${opt.age} anos`
                    : "Dependente"}
              </Text>
            </View>
            {active ? (
              <View style={styles.checkCircle}>
                <Feather name="check" size={14} color={colors.primaryForeground} />
              </View>
            ) : (
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: {
    backgroundColor: "rgba(198,163,78,0.06)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(198,163,78,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelf: {
    backgroundColor: "rgba(198,163,78,0.12)",
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.4)",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  sub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
