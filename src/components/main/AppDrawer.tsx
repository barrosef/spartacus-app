import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Application from "expo-application";
import { colors, typography, spacing } from "../../theme/tokens";
import { isStaffRoles } from "../../constants/roles";

const DRAWER_WIDTH = 280;

// Versão exibida no rodapé do menu (facilita identificar o build instalado).
const APP_VERSION = Application.nativeApplicationVersion ?? "—";
const BUILD_NUMBER = Application.nativeBuildVersion ?? "—";

interface DrawerItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const MENU_ITEMS: DrawerItem[] = [
  { key: "frequency", label: "Frequência", icon: "check-square" },
  { key: "donations", label: "Apoio", icon: "heart" },
];

const STAFF_MENU_ITEMS: DrawerItem[] = [
  { key: "staff_matriculas", label: "Matrículas", icon: "user-check" },
  { key: "staff_anamneses", label: "Anamneses", icon: "clipboard" },
  { key: "staff_graduacoes", label: "Graduações", icon: "award" },
  { key: "staff_frequencia", label: "Frequência (gestão)", icon: "check-square" },
  { key: "staff_doacoes", label: "Apoio (gestão)", icon: "heart" },
];

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userInitials: string;
  userRoles: string[];
  onNavigate: (key: string) => void;
}

export function AppDrawer({
  visible,
  onClose,
  userName,
  userInitials,
  userRoles,
  onNavigate,
}: AppDrawerProps) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleNavigate = (key: string) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      onNavigate(key);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Drawer panel */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{userName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Menu items */}
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => handleNavigate(item.key)}
            >
              <Feather
                name={item.icon}
                size={20}
                color={colors.mutedForeground}
              />
              <Text style={styles.rowLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Staff-only Gestão section */}
          {isStaffRoles(userRoles) && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionLabel}>GESTÃO</Text>
              {STAFF_MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => handleNavigate(item.key)}
                >
                  <Feather
                    name={item.icon}
                    size={20}
                    color={colors.mutedForeground}
                  />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Rodapé: versão do app */}
          <View style={styles.footerSpacer} />
          <Text style={styles.versionText}>
            Versão {APP_VERSION} (build {BUILD_NUMBER})
          </Text>
        </Animated.View>

        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.xl + spacing.lg,
    paddingBottom: spacing.lg,
    zIndex: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1,
  },
  footerSpacer: {
    flex: 1,
    minHeight: spacing.lg,
  },
  versionText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(198,163,78,0.1)",
    borderWidth: 2,
    borderColor: "rgba(198,163,78,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
  },
  rowLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
});
