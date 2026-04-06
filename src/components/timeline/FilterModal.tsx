import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius, buttonHeight } from "../../theme/tokens";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedType: string | null;
  onApply: (type: string | null) => void;
}

interface TypeOption {
  value: string | null;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const PERIOD_OPTIONS = [
  { value: null, label: "Qualquer" },
  { value: "today", label: "Hoje" },
  { value: "3days", label: "Ultimos 3 dias" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
] as const;

const TYPE_OPTIONS: TypeOption[] = [
  { value: null, label: "Todos", icon: "layers" },
  { value: "donation", label: "Doacoes", icon: "gift" },
  { value: "attendance", label: "Frequencia", icon: "check-square" },
  { value: "post", label: "Posts & Avisos", icon: "edit-3" },
  { value: "event", label: "Eventos", icon: "calendar" },
  { value: "championship", label: "Campeonatos", icon: "award" },
];

export function FilterModal({
  visible,
  onClose,
  selectedType,
  onApply,
}: FilterModalProps) {
  const [localType, setLocalType] = useState<string | null>(selectedType);
  const [localPeriod, setLocalPeriod] = useState<string | null>(null);

  function handleApply() {
    onApply(localType);
    onClose();
  }

  function handleReset() {
    setLocalType(null);
    setLocalPeriod(null);
  }

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
              {/* Handle indicator */}
              <View style={styles.handleRow}>
                <View style={styles.handle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Filtros</Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Period section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Periodo</Text>
                  <View style={styles.chipRow}>
                    {PERIOD_OPTIONS.map((opt) => {
                      const active = localPeriod === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value ?? "any"}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setLocalPeriod(opt.value)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Type section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tipo</Text>
                  <View style={styles.chipRow}>
                    {TYPE_OPTIONS.map((opt) => {
                      const active = localType === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value ?? "all"}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setLocalType(opt.value)}
                          activeOpacity={0.8}
                        >
                          <Feather
                            name={opt.icon}
                            size={14}
                            color={
                              active
                                ? colors.primary
                                : colors.mutedForeground
                            }
                          />
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetText}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyText}>Aplicar Filtros</Text>
                </TouchableOpacity>
              </View>
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
    maxHeight: "70%",
    paddingBottom: spacing.xl,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  chipTextActive: {
    color: colors.primary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    height: buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  applyButton: {
    flex: 1,
    height: buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
});
