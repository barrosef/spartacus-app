import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";

export type TabKey = "feed" | "checkin" | "calendar" | "donations";

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: Tab[] = [
  { key: "feed", label: "Feed", icon: "home" },
  { key: "checkin", label: "Check-in", icon: "check-square" },
  { key: "calendar", label: "Calendário", icon: "calendar" },
  { key: "donations", label: "Doações", icon: "heart" },
];

interface BottomNavProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabBtn}
            activeOpacity={0.7}
            onPress={() => onTabPress(tab.key)}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Feather
                name={tab.icon}
                size={24}
                color={active ? colors.primary : colors.mutedForeground}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(26,28,38,0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(42,45,62,0.4)",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg + 4,
    paddingHorizontal: spacing.sm,
  },
  tabBtn: {
    alignItems: "center",
    gap: 4,
    width: 64,
  },
  iconWrap: {
    padding: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.transparent,
  },
  iconWrapActive: {
    backgroundColor: "rgba(198,163,78,0.15)",
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  labelActive: {
    color: colors.primary,
  },
});
