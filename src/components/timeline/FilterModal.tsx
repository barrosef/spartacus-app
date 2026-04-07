import React, { useState, useEffect, useRef } from "react";
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
  { value: "3days", label: "Últimos 3 dias" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
] as const;

const TYPE_OPTIONS: TypeOption[] = [
  { value: null, label: "Todos", icon: "layers" },
  { value: "donation", label: "Doações", icon: "gift" },
  { value: "attendance", label: "Frequência", icon: "check-square" },
  { value: "post", label: "Posts & Avisos", icon: "edit-3" },
  { value: "event", label: "Eventos", icon: "calendar" },
  { value: "championship", label: "Campeonatos", icon: "award" },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 360);

export function FilterModal({
  visible,
  onClose,
  selectedType,
  onApply,
}: FilterModalProps) {
  const [localType, setLocalType] = useState<string | null>(selectedType);
  const [localPeriod, setLocalPeriod] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocalType(selectedType);
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
  }, [visible, selectedType, slideAnim, fadeAnim]);

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

  function handleApply() {
    onApply(localType);
    handleClose();
  }

  function handleReset() {
    setLocalType(null);
    setLocalPeriod(null);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Right-side panel */}
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filtros</Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Period section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Período</Text>
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
                          active ? colors.primary : colors.mutedForeground
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
              <Text style={styles.applyText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
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
    fontSize: 13,
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
    paddingBottom: spacing.lg + spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    height: buttonHeight - 8,
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
    fontSize: 14,
  },
  applyButton: {
    flex: 1,
    height: buttonHeight - 8,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  applyText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
  },
});
