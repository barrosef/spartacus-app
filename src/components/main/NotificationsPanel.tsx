import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radius } from "../../theme/tokens";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
}

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 380);

export function NotificationsPanel({
  visible,
  onClose,
  notifications,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    } else {
      slideAnim.setValue(PANEL_WIDTH);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 200,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => onClose());
  }

  const hasUnread = notifications.some((n) => !n.read);

  // O painel ocupa toda a altura; sem o inset, o último item da lista fica
  // atrás da barra de navegação do Android sob edge-to-edge.
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Feather name="bell" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Notificações</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {hasUnread && (
            <TouchableOpacity
              style={styles.markAllRow}
              onPress={onMarkAllRead}
              activeOpacity={0.7}
            >
              <Feather name="check" size={14} color={colors.primary} />
              <Text style={styles.markAllText}>Marcar todas como lidas</Text>
            </TouchableOpacity>
          )}

          {/* List */}
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather
                  name="bell-off"
                  size={32}
                  color={colors.mutedForeground}
                />
              </View>
              <Text style={styles.emptyTitle}>Sem notificações</Text>
              <Text style={styles.emptyMessage}>
                Você verá aqui as notificações enviadas pelo aplicativo.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + spacing.md },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((n) => (
                <View
                  key={n.id}
                  style={[styles.item, !n.read && styles.itemUnread]}
                >
                  {!n.read && <View style={styles.unreadDot} />}
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {n.title}
                    </Text>
                    {!!n.body && (
                      <Text style={styles.itemBody} numberOfLines={3}>
                        {n.body}
                      </Text>
                    )}
                    <Text style={styles.itemTime}>
                      {formatTime(n.receivedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.card,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  markAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  markAllText: {
    color: colors.primary,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(153,153,153,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  emptyMessage: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  itemUnread: {
    borderColor: "rgba(198,163,78,0.4)",
    backgroundColor: "rgba(198,163,78,0.05)",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  itemBody: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  itemTime: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
    marginTop: 4,
  },
});
