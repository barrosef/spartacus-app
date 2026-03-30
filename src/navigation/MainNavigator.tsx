import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";
import { api } from "../lib/api";
import { useProxy, ProxyProvider } from "../context/ProxyContext";
import { AppHeader } from "../components/main/AppHeader";
import { BottomNav, type TabKey } from "../components/main/BottomNav";
import { ProxyBanner } from "../components/main/ProxyBanner";
import { ContextSwitcher } from "../components/main/ContextSwitcher";
import { FeedScreen } from "../screens/main/FeedScreen";
import { CheckinScreen } from "../screens/main/CheckinScreen";
import { CalendarScreen } from "../screens/main/CalendarScreen";
import { DonationsScreen } from "../screens/main/DonationsScreen";

const TAB_SUBTITLES: Record<TabKey, string> = {
  feed: "Timeline de Avisos",
  checkin: "Check-in de Presença",
  calendar: "Calendário",
  donations: "Doações",
};

interface ProfileData {
  name: string;
  roles: string[];
}

interface DependentData {
  uid: string;
  name: string;
  birthDate?: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function calculateAge(birthDate: string): number | null {
  try {
    const [d, m, y] = birthDate.split("/").map(Number);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

function MainContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dependents, setDependents] = useState<DependentData[]>([]);
  const { switchTo, clearProxy } = useProxy();

  const isGuardian = profile?.roles.includes("guardian") ?? false;

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.get<ProfileData>("/users/me/profile");
      setProfile(data);
    } catch {
      // Graceful fallback
    }
  }, []);

  const fetchDependents = useCallback(async () => {
    try {
      const data = await api.get<DependentData[]>("/users/me/dependents");
      setDependents(data);
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (isGuardian) {
      fetchDependents();
    }
  }, [isGuardian, fetchDependents]);

  const userName = profile?.name ?? "Usuário";
  const userInitials = getInitials(userName);

  const handleProfilePress = () => {
    if (isGuardian && dependents.length > 0) {
      setSwitcherVisible(true);
    } else {
      // TODO: navigate to profile screen (Fase F)
    }
  };

  const handleSelectSelf = () => {
    clearProxy();
    // TODO: navigate to profile screen (Fase F)
  };

  const handleSelectDependent = (dep: DependentData) => {
    switchTo(dep.uid, dep.name);
    // TODO: navigate to profile screen in proxy mode (Fase F)
  };

  const renderTab = () => {
    switch (activeTab) {
      case "feed":
        return <FeedScreen />;
      case "checkin":
        return <CheckinScreen />;
      case "calendar":
        return <CalendarScreen />;
      case "donations":
        return <DonationsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        subtitle={TAB_SUBTITLES[activeTab]}
        userInitials={userInitials}
        onProfilePress={handleProfilePress}
      />
      <ProxyBanner />
      <View style={styles.content}>{renderTab()}</View>
      <BottomNav activeTab={activeTab} onTabPress={setActiveTab} />

      <ContextSwitcher
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        userName={userName}
        userInitials={userInitials}
        dependents={dependents.map((d) => ({
          uid: d.uid,
          name: d.name,
          age: d.birthDate ? calculateAge(d.birthDate) : null,
        }))}
        onSelectSelf={handleSelectSelf}
        onSelectDependent={handleSelectDependent}
      />
    </SafeAreaView>
  );
}

export function MainNavigator() {
  return (
    <ProxyProvider>
      <MainContent />
    </ProxyProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
