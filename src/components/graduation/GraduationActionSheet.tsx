import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import type { GradAction, GradCard } from "./types";

interface GraduationActionSheetProps {
  card: GradCard | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: GradAction, card: GradCard) => void;
}

interface Row {
  action: GradAction;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  danger?: boolean;
  muted?: boolean;
}

/**
 * Bottom sheet with the state-appropriate actions for an APPROVED graduation:
 * add degree, promote belt, undo — each gated by the backend-computed flags.
 * Branded (no native ActionSheet), matching the app's dialog convention.
 */
export function GraduationActionSheet({
  card,
  visible,
  onClose,
  onAction,
}: GraduationActionSheetProps) {
  // Com o edge-to-edge obrigatório da API 36 o sheet desenha por baixo da
  // barra de navegação: sem o inset o "Cancelar" encosta nos botões do
  // sistema. Hook antes do early return (regras de hooks).
  const insets = useSafeAreaInsets();

  if (!card) return null;

  const rows: Row[] = [];
  if (card.canAddDegree) {
    rows.push({ action: "degree", label: "Adicionar grau", icon: "plus" });
  }
  if (card.nextBelt) {
    rows.push({
      action: "belt",
      label: card.belt
        ? `Promover para ${card.nextBelt.name}`
        : `Graduar (${card.nextBelt.name})`,
      icon: "chevrons-up",
    });
  }
  if (card.canUndo) {
    rows.push({ action: "undo", label: "Desfazer", icon: "rotate-ccw", muted: true });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                { paddingBottom: insets.bottom + spacing.md },
              ]}
            >
              <View style={styles.grabber} />
              <Text style={styles.title}>
                {card.modalityName} · {card.beltName ?? card.belt ?? "Graduação"}
              </Text>
              {rows.map((r) => (
                <TouchableOpacity
                  key={r.action}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => onAction(r.action, card)}
                >
                  <Feather
                    name={r.icon}
                    size={18}
                    color={r.danger ? colors.error : r.muted ? colors.mutedForeground : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.rowLabel,
                      r.danger && { color: colors.error },
                      r.muted && { color: colors.mutedForeground },
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelLabel}>Cancelar</Text>
              </TouchableOpacity>
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xs,
  },
  rowLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
  cancel: {
    marginTop: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
});
