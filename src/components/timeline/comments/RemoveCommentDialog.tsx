// src/components/timeline/comments/RemoveCommentDialog.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, Modal, Switch, TextInput, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { Button } from "../../ui/Button";

export type ModerationLevel = "comment_blocked" | "app_banned";

/**
 * Modal unificada de remoção de comentário por staff (spec 2026-07-16):
 * confirmação + toggles de restrição do autor + motivo obrigatório quando
 * alguma restrição está ligada. Substitui o fluxo de 3 etapas
 * (confirm → modal de restrição → ReasonPrompt). Nunca usada para o
 * próprio comentário do removedor.
 */
interface Props {
  visible: boolean;
  authorName: string;
  canBanApp: boolean;
  onCancel: () => void;
  onConfirm: (restrict: { level: ModerationLevel; reason: string } | null) => void;
}

export function RemoveCommentDialog({
  visible, authorName, canBanApp, onCancel, onConfirm,
}: Props) {
  const [blockComments, setBlockComments] = useState(false);
  const [banApp, setBanApp] = useState(false);
  const [reason, setReason] = useState("");

  // Zera o estado a cada abertura — restrição/motivo não vazam entre alvos.
  useEffect(() => {
    if (visible) { setBlockComments(false); setBanApp(false); setReason(""); }
  }, [visible]);

  const restricting = blockComments || banApp;
  const trimmedReason = reason.trim();
  const canConfirm = !restricting || trimmedReason.length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    if (!restricting) { onConfirm(null); return; }
    // Banir implica bloquear: com os dois ligados, aplica só app_banned.
    onConfirm({
      level: banApp ? "app_banned" : "comment_blocked",
      reason: trimmedReason,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                <Text style={styles.title}>Remover comentário</Text>
                <Text style={styles.message}>
                  Tem certeza que deseja remover o comentário de {authorName}?
                </Text>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Bloquear comentários</Text>
                  <Switch
                    value={blockComments}
                    onValueChange={setBlockComments}
                    trackColor={{ false: colors.border, true: colors.primaryMuted }}
                    thumbColor={blockComments ? colors.primary : colors.mutedForeground}
                  />
                </View>

                {canBanApp ? (
                  <View style={styles.toggleRow}>
                    <Text style={[styles.toggleLabel, banApp && styles.toggleLabelDanger]}>
                      Banir do app
                    </Text>
                    <Switch
                      value={banApp}
                      onValueChange={setBanApp}
                      trackColor={{ false: colors.border, true: colors.primaryMuted }}
                      thumbColor={banApp ? colors.error : colors.mutedForeground}
                    />
                  </View>
                ) : null}

                {restricting ? (
                  <>
                    <Text style={styles.warning}>
                      {banApp
                        ? `⚠ ${authorName} será banido do app.`
                        : `⚠ ${authorName} não poderá mais comentar neste projeto.`}
                    </Text>
                    <TextInput
                      style={styles.reasonInput}
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Motivo (obrigatório)"
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                      textAlignVertical="top"
                    />
                  </>
                ) : null}

                <View style={styles.footer}>
                  <Button variant="outline" label="Cancelar" onPress={onCancel} style={styles.btn} />
                  <Button label="Remover" onPress={confirm} disabled={!canConfirm} style={styles.btn} />
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
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
  },
  message: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 15,
  },
  toggleLabelDanger: {
    color: colors.error,
  },
  warning: {
    color: colors.error,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
    minHeight: 72,
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
