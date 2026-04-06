import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";
import type { CalendarView, FilterKey } from "./types";
import { FILTER_COLORS } from "./types";

const VIEWS: { key: CalendarView; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: "agenda", icon: "list", label: "Agenda" },
  { key: "day", icon: "square", label: "Dia" },
  { key: "week", icon: "grid", label: "Semana" },
  { key: "month", icon: "calendar", label: "Mês" },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "classes", label: "Aulas" },
  { key: "my_classes", label: "Minhas aulas" },
  { key: "events", label: "Eventos" },
  { key: "championships", label: "Campeonatos" },
];

interface CalendarSidebarProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userInitials: string;
  activeView: CalendarView;
  onViewChange: (v: CalendarView) => void;
  filters: Set<FilterKey>;
  onFilterToggle: (f: FilterKey) => void;
  onRefresh: () => void;
}

export function CalendarSidebar({
  visible,
  onClose,
  userName,
  userInitials,
  activeView,
  onViewChange,
  filters,
  onFilterToggle,
  onRefresh,
}: CalendarSidebarProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sidebar}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{userName}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
          </View>

          {/* Views */}
          {VIEWS.map((v) => {
            const active = v.key === activeView;
            return (
              <TouchableOpacity
                key={v.key}
                style={[styles.row, active && styles.rowActive]}
                activeOpacity={0.7}
                onPress={() => { onViewChange(v.key); onClose(); }}
              >
                <Feather
                  name={v.icon}
                  size={18}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Refresh */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => { onRefresh(); onClose(); }}
          >
            <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
            <Text style={styles.rowLabel}>Atualizar</Text>
          </TouchableOpacity>

          {/* Filters */}
          <Text style={styles.filterTitle}>Filtros</Text>
          {FILTERS.map((f) => {
            const active = filters.has(f.key);
            const color = FILTER_COLORS[f.key];
            return (
              <TouchableOpacity
                key={f.key}
                style={styles.filterRow}
                activeOpacity={0.7}
                onPress={() => onFilterToggle(f.key)}
              >
                <View style={[
                  styles.checkbox,
                  active && { backgroundColor: color, borderColor: color },
                ]}>
                  {active && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={styles.rowLabel}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 260,
    backgroundColor: colors.card,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(198,163,78,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 13,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  rowActive: {
    backgroundColor: "rgba(198,163,78,0.1)",
  },
  rowLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 14,
  },
  rowLabelActive: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },
  filterTitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
