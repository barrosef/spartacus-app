import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

interface DependentInfo {
  uid: string;
  name: string;
  age: number | null;
}

interface ContextSwitcherProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userInitials: string;
  dependents: DependentInfo[];
  onSelectSelf: () => void;
  onSelectDependent: (dep: DependentInfo) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ContextSwitcher({
  visible,
  onClose,
  userName,
  userInitials,
  dependents,
  onSelectSelf,
  onSelectDependent,
}: ContextSwitcherProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          {/* Own profile */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              onSelectSelf();
              onClose();
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{userName}</Text>
              <Text style={styles.sub}>Meu perfil</Text>
            </View>
          </TouchableOpacity>

          {dependents.length > 0 && <View style={styles.divider} />}

          {/* Dependents */}
          {dependents.map((dep) => (
            <TouchableOpacity
              key={dep.uid}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                onSelectDependent(dep);
                onClose();
              }}
            >
              <View style={styles.avatarDep}>
                <Text style={styles.avatarText}>
                  {getInitials(dep.name)}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {dep.name}
                  {dep.age != null && (
                    <Text style={styles.age}>{`  · ${dep.age} anos`}</Text>
                  )}
                </Text>
                <Text style={styles.sub}>Aluno(a)</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-start",
    paddingTop: 100,
    paddingHorizontal: spacing.md,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm + 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(198,163,78,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarDep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(198,163,78,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  age: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  sub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
});
