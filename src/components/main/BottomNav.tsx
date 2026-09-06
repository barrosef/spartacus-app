import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  typography,
  spacing,
  radius,
} from "../../theme/tokens";

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
  { key: "donations", label: "Apoio", icon: "heart" },
];

interface BottomNavProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  showPostButton?: boolean;
  onPostPress?: () => void;
}

export function BottomNav({
  activeTab,
  onTabPress,
  showPostButton = false,
  onPostPress,
}: BottomNavProps) {
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  // Sob edge-to-edge (obrigatório na API 36) o app desenha atrás da barra de
  // navegação do Android. Reservar o inset AQUI, e não no SafeAreaView do
  // MainNavigator, mantém o fundo da barra de abas se estendendo por baixo
  // dela — com o inset no SafeAreaView sobraria uma faixa lisa embaixo.
  // O valor varia: ~48dp nos 3 botões, ~24dp no gesto, 0 no modo imersivo.
  const insets = useSafeAreaInsets();
  const containerStyle = [
    styles.container,
    { paddingBottom: insets.bottom + spacing.sm },
  ];

  if (!showPostButton) {
    return (
      <View style={containerStyle}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            active={tab.key === activeTab}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {leftTabs.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          active={tab.key === activeTab}
          onPress={() => onTabPress(tab.key)}
        />
      ))}

      {/* Central post button */}
      <TouchableOpacity
        style={styles.postBtn}
        activeOpacity={0.8}
        onPress={onPostPress}
      >
        <View style={styles.postBtnInner}>
          <Feather name="plus" size={28} color={colors.primaryForeground} />
        </View>
      </TouchableOpacity>

      {rightTabs.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          active={tab.key === activeTab}
          onPress={() => onTabPress(tab.key)}
        />
      ))}
    </View>
  );
}

function TabItem({
  tab,
  active,
  onPress,
}: {
  tab: Tab;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tabBtn}
      activeOpacity={0.7}
      onPress={onPress}
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
    // paddingBottom vem do inset da barra de navegação, em containerStyle.
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
  postBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
  },
  postBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
