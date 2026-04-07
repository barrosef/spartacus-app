import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";
import { api } from "../lib/api";
import { useProxy, ProxyProvider } from "../context/ProxyContext";
import { useNotifications, NotificationsProvider } from "../context/NotificationsContext";
import { AppHeader } from "../components/main/AppHeader";
import { AppDrawer } from "../components/main/AppDrawer";
import { BottomNav, type TabKey } from "../components/main/BottomNav";
import { ProxyBanner } from "../components/main/ProxyBanner";
import { ContextSwitcher } from "../components/main/ContextSwitcher";
import { NotificationsPanel } from "../components/main/NotificationsPanel";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { FeedScreen } from "../screens/main/FeedScreen";
import { CheckinScreen } from "../screens/main/CheckinScreen";
import { CalendarScreen } from "../screens/main/CalendarScreen";
import { DonationsScreen } from "../screens/main/DonationsScreen";
import { FrequencyHistoryScreen } from "../screens/main/FrequencyHistoryScreen";
import { MyDonationsScreen } from "../screens/main/MyDonationsScreen";
import { PostWizardScreen } from "../screens/main/PostWizardScreen";

const TAB_SUBTITLES: Record<TabKey, string> = {
  feed: "Timeline de Avisos",
  checkin: "Check-in de Presença",
  calendar: "Calendário",
  donations: "Doações",
};

interface ProfileData {
  name: string;
  roles: string[];
  photoUrl?: string | null;
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
  const [showProfile, setShowProfile] = useState(false);
  const [showFrequency, setShowFrequency] = useState(false);
  const [showMyDonations, setShowMyDonations] = useState(false);
  const [showPostWizard, setShowPostWizard] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [feedFilterVisible, setFeedFilterVisible] = useState(false);
  const [feedTypeFilter, setFeedTypeFilter] = useState<string | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dependents, setDependents] = useState<DependentData[]>([]);
  const { switchTo, clearProxy } = useProxy();
  const notifs = useNotifications();

  const isGuardian = profile?.roles.includes("guardian") ?? false;
  const hasSocialRole = profile?.roles.includes("social") ?? false;

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
      setShowProfile(true);
    }
  };

  const handleSelectSelf = () => {
    clearProxy();
    setShowProfile(true);
  };

  const handleSelectDependent = (dep: DependentData) => {
    switchTo(dep.uid, dep.name);
    setShowProfile(true);
  };

  const handleDrawerNavigate = (key: string) => {
    if (key === "donations") setShowMyDonations(true);
    if (key === "frequency") setShowFrequency(true);
  };

  if (showProfile) {
    return (
      <ProfileScreen onBack={() => { setShowProfile(false); fetchProfile(); }} />
    );
  }

  if (showFrequency) {
    return (
      <FrequencyHistoryScreen onBack={() => setShowFrequency(false)} />
    );
  }

  if (showPostWizard) {
    return (
      <PostWizardScreen
        onClose={() => {
          setShowPostWizard(false);
          setActiveTab("feed");
        }}
      />
    );
  }

  if (showMyDonations) {
    return (
      <MyDonationsScreen
        onBack={() => setShowMyDonations(false)}
        onNewDonation={() => {
          setShowMyDonations(false);
          setActiveTab("donations");
        }}
      />
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "feed":
        return (
          <FeedScreen
            userRoles={profile?.roles ?? []}
            typeFilter={feedTypeFilter}
            filterVisible={feedFilterVisible}
            onFilterClose={() => setFeedFilterVisible(false)}
            onFilterChange={(t) => setFeedTypeFilter(t)}
          />
        );
      case "checkin":
        return <CheckinScreen onDone={() => setActiveTab("feed")} />;
      case "calendar":
        return <CalendarScreen />;
      case "donations":
        return <DonationsScreen onDone={() => setActiveTab("feed")} />;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        subtitle={TAB_SUBTITLES[activeTab]}
        userInitials={userInitials}
        photoUrl={profile?.photoUrl}
        onProfilePress={handleProfilePress}
        onMenuPress={() => setDrawerVisible(true)}
        onFilterPress={
          activeTab === "feed"
            ? () => setFeedFilterVisible(true)
            : undefined
        }
        filterActive={activeTab === "feed" && !!feedTypeFilter}
        onBellPress={() => setNotificationsVisible(true)}
        unreadCount={notifs.unreadCount}
      />
      <ProxyBanner />
      <View style={styles.content}>{renderTab()}</View>
      <BottomNav
        activeTab={activeTab}
        onTabPress={setActiveTab}
        showPostButton={hasSocialRole}
        onPostPress={() => setShowPostWizard(true)}
      />

      <AppDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        userName={userName}
        userInitials={userInitials}
        onNavigate={handleDrawerNavigate}
      />

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

      <NotificationsPanel
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        notifications={notifs.notifications}
        onMarkAllRead={notifs.markAllRead}
      />
    </SafeAreaView>
  );
}

export function MainNavigator() {
  return (
    <NotificationsProvider>
      <ProxyProvider>
        <MainContent />
      </ProxyProvider>
    </NotificationsProvider>
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
