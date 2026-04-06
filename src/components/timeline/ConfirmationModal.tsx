import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  radius,
  buttonHeight,
} from "../../theme/tokens";

type ActionType = "confirm" | "absent";

interface ConfirmationModalProps {
  visible: boolean;
  action: ActionType;
  /** "presença" or "doação" */
  entityLabel: string;
  /** Name of the student/user */
  targetName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_CONFIG: Record<
  ActionType,
  {
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    iconBg: string;
    title: string;
    buttonLabel: string;
    buttonColor: string;
  }
> = {
  confirm: {
    icon: "check-circle",
    iconColor: colors.success,
    iconBg: "rgba(76,175,80,0.12)",
    title: "Confirmar registro",
    buttonLabel: "Sim, confirmar",
    buttonColor: colors.success,
  },
  absent: {
    icon: "x-circle",
    iconColor: colors.error,
    iconBg: "rgba(239,68,68,0.12)",
    title: "Registrar ausência",
    buttonLabel: "Sim, registrar ausência",
    buttonColor: colors.error,
  },
};

export function ConfirmationModal({
  visible,
  action,
  entityLabel,
  targetName,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const config = ACTION_CONFIG[action];

  const message =
    action === "confirm"
      ? `Você está prestes a confirmar o registro de ${entityLabel} de ${targetName}. Esta ação valida que o registro é legítimo.`
      : `Você está prestes a marcar como ausência o registro de ${entityLabel} de ${targetName}. O aluno poderá solicitar uma revisão.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Large icon */}
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <Feather
              name={config.icon}
              size={48}
              color={config.iconColor}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Target info */}
          <View style={styles.targetCard}>
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={styles.targetName}>{targetName}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: config.buttonColor },
              ]}
              activeOpacity={0.8}
              onPress={onConfirm}
            >
              <Feather
                name={action === "confirm" ? "check" : "x"}
                size={20}
                color={colors.white}
              />
              <Text style={styles.actionBtnText}>
                {config.buttonLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={onCancel}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 22,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    alignSelf: "stretch",
  },
  targetName: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  actions: {
    alignSelf: "stretch",
    gap: spacing.sm,
  },
  actionBtn: {
    height: buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  actionBtnText: {
    color: colors.white,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 16,
  },
  cancelBtn: {
    height: buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 16,
  },
});
