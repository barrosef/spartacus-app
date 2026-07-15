import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { Button } from "../ui/Button";

/**
 * Branded modal prompting for a required free-text reason — used by staff
 * moderation actions (bloquear comentários / banir) and, later, comment
 * deletion. Mirrors the look of DialogProvider's modal (overlay + card +
 * Button), but adds a multiline TextInput since DialogProvider itself only
 * supports alert/confirm copy. Controlled component: visibility and submit
 * are owned by the caller.
 */
interface ReasonPromptProps {
  visible: boolean;
  title?: string;
  confirmText?: string;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

export function ReasonPrompt({
  visible,
  title = "Informe o motivo",
  confirmText = "Confirmar",
  onCancel,
  onSubmit,
}: ReasonPromptProps) {
  const [reason, setReason] = useState("");

  // Reset the field whenever the prompt is (re)opened, so a previous reason
  // doesn't leak into the next action.
  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.overlayFill}>
            <TouchableWithoutFeedback>
              <View style={styles.container}>
                <Text style={styles.title}>{title}</Text>

                <TextInput
                  style={styles.input}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Descreva o motivo..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={4}
                  autoFocus
                  textAlignVertical="top"
                />

                <View style={styles.footer}>
                  <Button
                    variant="outline"
                    label="Cancelar"
                    onPress={onCancel}
                    style={styles.btn}
                  />
                  <Button
                    label={confirmText}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={styles.btn}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayFill: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontHeadingSemi,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
    minHeight: 96,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
  },
});
