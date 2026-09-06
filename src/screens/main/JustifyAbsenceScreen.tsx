import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  colors,
  typography,
  spacing,
  radius,
  buttonHeight,
} from "../../theme/tokens";
import { api, getProjectId } from "../../lib/api";
import { uploadFile, type UploadedAttachment } from "../../lib/uploadFile";
import { useDialog } from "../../components/ui/DialogProvider";
import { useProxy } from "../../context/ProxyContext";
import { Button } from "../../components/ui/Button";
import { SuccessScreen } from "../../components/ui/SuccessScreen";

/**
 * Sub-projeto B (Justificativa de Faltas) — Task B7: fluxo do
 * aluno/responsável para justificar uma falta dentro do prazo (7 dias).
 *
 * Passos: tipo -> texto -> anexo (condicional ao tipo) -> confirmar
 * (useDialog) -> POST /attendance/{id}/justify.
 *
 * See: docs/superpowers/specs/2026-07-18-justificativa-faltas-design.md
 * (seção "Fluxo do aluno/responsável").
 */

export interface JustifiableRecord {
  id: string;
  date: string;
  modalityName: string;
}

interface JustificationTypeOption {
  slug: string;
  name: string;
  allowsAttachment: boolean;
  requiresAttachment: boolean;
  order: number;
}

type Screen = "loading" | "ready" | "error";
type Step = "type" | "text" | "attachment" | "success";

interface JustifyAbsenceScreenProps {
  record: JustifiableRecord;
  onClose: () => void;
  /** Called after a successful submit, so the caller can refresh its list. */
  onJustified: () => void;
}

export function JustifyAbsenceScreen({
  record,
  onClose,
  onJustified,
}: JustifyAbsenceScreenProps) {
  const dialog = useDialog();
  const { actingAs } = useProxy();
  const [screen, setScreen] = useState<Screen>("loading");
  const [types, setTypes] = useState<JustificationTypeOption[]>([]);
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<JustificationTypeOption | null>(null);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (actingAs) headers["X-Acting-As"] = actingAs;
    return headers;
  }, [actingAs]);

  const loadTypes = useCallback(async () => {
    setScreen("loading");
    try {
      const projectId = getProjectId();
      const res = await api.get<{ types: JustificationTypeOption[] }>(
        `/projects/${projectId}/justification-types`,
      );
      const sorted = [...res.types].sort((a, b) => a.order - b.order);
      setTypes(sorted);
      setScreen("ready");
    } catch {
      setScreen("error");
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const needsAttachmentStep = !!(
    selectedType && (selectedType.allowsAttachment || selectedType.requiresAttachment)
  );

  const doUpload = useCallback(
    async (uri: string, fileName: string, mimeType: string) => {
      setUploading(true);
      try {
        const result = await uploadFile(
          "/attendance/justification-upload",
          uri,
          fileName,
          mimeType,
        );
        setAttachment(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar anexo";
        dialog.alert({ title: "Erro", message: msg, tone: "danger" });
      } finally {
        setUploading(false);
      }
    },
    [dialog],
  );

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      dialog.alert({
        title: "Permissão necessária",
        message: "Habilite o acesso à galeria nas configurações.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase();
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const name = asset.fileName ?? `justificativa_${Date.now()}.${ext}`;
    await doUpload(asset.uri, name, mime);
  }, [dialog, doUpload]);

  const pickPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      await doUpload(asset.uri, asset.name, asset.mimeType ?? "application/pdf");
    } catch {
      dialog.alert({
        title: "Erro",
        message: "Não foi possível selecionar o arquivo.",
        tone: "danger",
      });
    }
  }, [dialog, doUpload]);

  const removeAttachment = useCallback(() => setAttachment(null), []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;
    if (selectedType.requiresAttachment && !attachment) {
      dialog.alert({
        title: "Anexo obrigatório",
        message: `O tipo "${selectedType.name}" exige um anexo.`,
        tone: "danger",
      });
      return;
    }
    const confirmed = await dialog.confirm({
      title: "Enviar justificativa?",
      message: "Sua justificativa será enviada para análise da equipe.",
      confirmText: "Enviar",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.post(
        `/attendance/${record.id}/justify`,
        {
          typeId: selectedType.slug,
          text: text.trim(),
          attachment: attachment
            ? { url: attachment.url, name: attachment.name, size: attachment.size }
            : undefined,
        },
        { headers: authHeaders() },
      );
      setStep("success");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Não foi possível enviar a justificativa.";
      dialog.alert({ title: "Não foi possível enviar", message: msg, tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, attachment, text, record.id, authHeaders, dialog]);

  const handleAdvanceFromText = useCallback(() => {
    if (needsAttachmentStep) {
      setStep("attachment");
    } else {
      handleSubmit();
    }
  }, [needsAttachmentStep, handleSubmit]);

  const handleBack = useCallback(() => {
    if (step === "type") {
      onClose();
    } else if (step === "text") {
      setStep("type");
    } else if (step === "attachment") {
      setStep("text");
    }
  }, [step, onClose]);

  if (step === "success") {
    return (
      <SuccessScreen
        title="Enviado!"
        message="Sua justificativa está em análise. Você verá o resultado em Minha Frequência."
        autoDismissMs={2200}
        onDismiss={onJustified}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Justificar Falta</Text>
          <Text style={styles.headerSubtitle}>
            {record.date} · {record.modalityName}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {screen === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {screen === "error" && (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-triangle" size={28} color={colors.error} />
          </View>
          <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
          <Text style={styles.emptyMsg}>
            Verifique sua conexão e tente novamente.
          </Text>
          <View style={styles.retryWrap}>
            <Button label="Tentar novamente" onPress={loadTypes} />
          </View>
        </View>
      )}

      {screen === "ready" && (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === "type" && (
              <>
                <Text style={styles.sectionTitle}>Tipo de justificativa</Text>
                <Text style={styles.sectionSub}>
                  Selecione o motivo que melhor descreve a sua falta.
                </Text>
                {types.length === 0 ? (
                  <Text style={styles.hint}>
                    Nenhum tipo de justificativa disponível no momento.
                  </Text>
                ) : (
                  <View style={styles.typeList}>
                    {types.map((t) => {
                      const active = selectedType?.slug === t.slug;
                      return (
                        <TouchableOpacity
                          key={t.slug}
                          style={[styles.typeRow, active && styles.typeRowActive]}
                          activeOpacity={0.8}
                          onPress={() => setSelectedType(t)}
                        >
                          <View
                            style={[styles.radioOuter, active && styles.radioOuterActive]}
                          >
                            {active && <View style={styles.radioInner} />}
                          </View>
                          <View style={styles.typeRowText}>
                            <Text
                              style={[
                                styles.typeRowLabel,
                                active && styles.typeRowLabelActive,
                              ]}
                            >
                              {t.name}
                            </Text>
                            {t.requiresAttachment ? (
                              <Text style={styles.typeRowHint}>Anexo obrigatório</Text>
                            ) : t.allowsAttachment ? (
                              <Text style={styles.typeRowHint}>Anexo opcional</Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {step === "text" && (
              <>
                <Text style={styles.sectionTitle}>Conte o que aconteceu</Text>
                <Text style={styles.sectionSub}>
                  Descreva brevemente o motivo da falta em{" "}
                  {selectedType?.name.toLowerCase()}.
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={text}
                  onChangeText={setText}
                  placeholder="Ex: Consulta médica marcada às 15h"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
              </>
            )}

            {step === "attachment" && (
              <>
                <Text style={styles.sectionTitle}>Anexo</Text>
                <Text style={styles.sectionSub}>
                  {selectedType?.requiresAttachment
                    ? "Este tipo exige um comprovante (imagem ou PDF, até 10MB)."
                    : "Se quiser, anexe um comprovante (imagem ou PDF, até 10MB)."}
                </Text>

                {!attachment && (
                  <View style={styles.mediaGrid}>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      activeOpacity={0.7}
                      onPress={pickImage}
                      disabled={uploading}
                    >
                      <Feather name="image" size={28} color={colors.mutedForeground} />
                      <Text style={styles.mediaBtnText}>Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      activeOpacity={0.7}
                      onPress={pickPdf}
                      disabled={uploading}
                    >
                      <Feather name="file-text" size={28} color={colors.mutedForeground} />
                      <Text style={styles.mediaBtnText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {uploading && (
                  <View style={styles.uploadingBar}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.uploadingText}>Enviando anexo...</Text>
                  </View>
                )}

                {attachment && (
                  <View style={styles.attachmentChip}>
                    <Feather
                      name={attachment.type === "image" ? "image" : "file-text"}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.attachmentSize}>
                      {(attachment.size / 1024).toFixed(0)} KB
                    </Text>
                    <TouchableOpacity onPress={removeAttachment} hitSlop={8}>
                      <Feather name="x" size={14} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.bottomBar}>
            {step === "type" && (
              <TouchableOpacity
                style={[styles.primaryBtn, !selectedType && styles.primaryBtnDisabled]}
                disabled={!selectedType}
                onPress={() => setStep("text")}
              >
                <Text style={styles.primaryBtnText}>Avançar</Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            )}

            {step === "text" && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (text.trim().length === 0 || submitting) && styles.primaryBtnDisabled,
                ]}
                disabled={text.trim().length === 0 || submitting}
                onPress={handleAdvanceFromText}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>
                      {needsAttachmentStep ? "Avançar" : "Enviar"}
                    </Text>
                    <Feather
                      name={needsAttachmentStep ? "arrow-right" : "send"}
                      size={18}
                      color={colors.primaryForeground}
                    />
                  </>
                )}
              </TouchableOpacity>
            )}

            {step === "attachment" && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (uploading ||
                    submitting ||
                    (selectedType?.requiresAttachment && !attachment)) &&
                    styles.primaryBtnDisabled,
                ]}
                disabled={
                  uploading ||
                  submitting ||
                  !!(selectedType?.requiresAttachment && !attachment)
                }
                onPress={handleSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Enviar</Text>
                    <Feather name="send" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  headerSubtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 2,
  },
  headerSpacer: { width: 24 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },

  sectionTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  sectionSub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  hint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    lineHeight: 19,
  },

  // Type selection
  typeList: { gap: spacing.sm },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  typeRowActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  typeRowText: { flex: 1, gap: 2 },
  typeRowLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  typeRowLabelActive: { color: colors.primary },
  typeRowHint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },

  // Text step
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
  },
  textArea: {
    height: 160,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },

  // Attachment step
  mediaGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mediaBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaBtnText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  uploadingText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentName: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  attachmentSize: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  primaryBtn: {
    height: buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 16,
  },

  // Error state (fetch types)
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(153,153,153,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  emptyMsg: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryWrap: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
});
