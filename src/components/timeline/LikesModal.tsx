import React from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { getInitials, avatarColor } from "./helpers";

interface LikeUser {
  uid: string;
  name: string;
  role: string;
}

interface LikesModalProps {
  visible: boolean;
  onClose: () => void;
  entryId: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor",
  instructor: "Instrutor",
  guardian: "Responsavel",
  supporter: "Apoiador",
  sponsor: "Patrocinador",
  owner: "Controlador",
  assistant: "Assistente",
};

/**
 * Placeholder data until the likes list endpoint is available.
 * Replace with actual API call when ready.
 */
function useLikes(_entryId: string): { data: LikeUser[]; loading: boolean } {
  return { data: [], loading: false };
}

function LikeRow({ user }: { user: LikeUser }) {
  const bgColor = avatarColor(user.name);
  const roleText = ROLE_LABELS[user.role] ?? user.role;

  return (
    <View style={styles.userRow}>
      <View style={[styles.avatar, { backgroundColor: bgColor }]}>
        <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.userRole}>{roleText}</Text>
      </View>
    </View>
  );
}

export function LikesModal({ visible, onClose, entryId }: LikesModalProps) {
  const { data, loading } = useLikes(entryId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Feather name="heart" size={18} color={colors.primary} />
                  <Text style={styles.headerTitle}>Curtidas</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* List */}
              {loading ? (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>Carregando...</Text>
                </View>
              ) : data.length === 0 ? (
                <View style={styles.placeholder}>
                  <Feather
                    name="heart"
                    size={32}
                    color={colors.mutedForeground}
                  />
                  <Text style={styles.placeholderText}>
                    Nenhuma curtida ainda
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={data}
                  keyExtractor={(item) => item.uid}
                  renderItem={({ item }) => <LikeRow user={item} />}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: "60%",
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  userRole: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 1,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  placeholderText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
  },
});
