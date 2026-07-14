import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import {
  colors,
  typography,
  spacing,
  radius,
  inputHeight,
  buttonHeight,
} from "../../theme/tokens";
import { api } from "../../lib/api";
import { useDialog } from "../../components/ui/DialogProvider";
import { SuccessScreen } from "../../components/ui/SuccessScreen";
import { AudioPreview } from "../../components/post/AudioPreview";
import { DateInput } from "../../components/ui/DateInput";
import { TimeInput } from "../../components/ui/TimeInput";

type PostType = "post" | "event" | "championship";
type Step = "content" | "media" | "schedule" | "success";
type AttType = "image" | "file" | "voice";

interface Attachment {
  type: AttType;
  url: string;
  name: string;
  size: number;
  localUri?: string;
}

interface PostWizardScreenProps {
  onClose: () => void;
}

const TYPE_OPTIONS: {
  key: PostType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: "post", label: "Post", icon: "edit-3" },
  { key: "event", label: "Evento", icon: "calendar" },
  { key: "championship", label: "Camp.", icon: "award" },
];

/**
 * Convert BR-format date+time ("dd/mm/aaaa", "HH:mm") into ISO-8601.
 * The backend stores events in this format and the calendar filter
 * slices the first 7 chars ("YYYY-MM") to match a month.
 */
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const parts = date.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  const timePart = time ? time.padStart(5, "0") : "00:00";
  return `${iso}T${timePart}:00`;
}

export function PostWizardScreen({ onClose }: PostWizardScreenProps) {
  const dialog = useDialog();
  const [step, setStep] = useState<Step>("content");
  const [postType, setPostType] = useState<PostType>("post");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    title: string;
    image: string;
    description: string;
  } | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Audio recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Between stop and upload: local URI awaiting user confirmation.
  const [pendingAudioUri, setPendingAudioUri] = useState<string | null>(null);

  // Detect URLs in description
  const handleDescriptionChange = useCallback(
    async (text: string) => {
      setDescription(text);
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (urlMatch && !linkPreview) {
        try {
          const preview = await api.get<{
            url: string;
            title: string;
            image: string;
            description: string;
          }>(
            `/timeline/link-preview?url=${encodeURIComponent(urlMatch[0])}`,
          );
          if (preview.title) setLinkPreview(preview);
        } catch {
          // Silent fail
        }
      }
    },
    [linkPreview],
  );

  // ── Upload helper ───────────────────────────────────────────────

  const uploadFile = useCallback(
    async (
      uri: string,
      fileName: string,
      mimeType: string,
    ): Promise<Attachment | null> => {
      setUploading(true);
      try {
        const formData = new FormData();
        if (Platform.OS === "web") {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          (formData as unknown as globalThis.FormData).append(
            "file",
            blob,
            fileName,
          );
        } else {
          formData.append("file", {
            uri,
            name: fileName,
            type: mimeType,
          } as unknown as Blob);
        }
        const result = await api.upload<Attachment>(
          "/posts/upload",
          formData,
        );
        return result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao enviar arquivo";
        dialog.alert({ title: "Erro", message: msg, tone: "danger" });
        return null;
      } finally {
        setUploading(false);
      }
    },
    [dialog],
  );

  // ── Pickers ─────────────────────────────────────────────────────

  const pickMedia = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      dialog.alert({
        title: "Permissão necessária",
        message: "Habilite o acesso à galeria nas configurações.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.85,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase();
      const mime =
        asset.type === "video"
          ? `video/${ext === "mov" ? "quicktime" : ext}`
          : ext === "jpg"
            ? "image/jpeg"
            : `image/${ext}`;
      const name =
        asset.fileName ?? `media_${Date.now()}.${ext}`;
      const att = await uploadFile(asset.uri, name, mime);
      if (att)
        setAttachments((prev) => [
          ...prev,
          { ...att, localUri: asset.uri },
        ]);
    }
  }, [uploadFile, dialog]);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      for (const asset of result.assets) {
        const att = await uploadFile(
          asset.uri,
          asset.name,
          asset.mimeType ?? "application/octet-stream",
        );
        if (att) setAttachments((prev) => [...prev, att]);
      }
    } catch {
      dialog.alert({
        title: "Erro",
        message: "Não foi possível selecionar o arquivo.",
        tone: "danger",
      });
    }
  }, [uploadFile, dialog]);

  // ── Audio recording ─────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        dialog.alert({
          title: "Permissão necessária",
          message: "Habilite o acesso ao microfone nas configurações.",
        });
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setRecordingDuration(0);
      recordingInterval.current = setInterval(
        () => setRecordingDuration((d) => d + 1),
        1000,
      );
    } catch {
      dialog.alert({
        title: "Erro",
        message: "Não foi possível iniciar a gravação.",
        tone: "danger",
      });
    }
  }, [dialog]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;
      // Enter preview phase — user must confirm before upload.
      setPendingAudioUri(uri);
    } catch {
      setRecording(null);
    }
  }, [recording]);

  const cancelRecording = useCallback(async () => {
    if (!recording) return;
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    setRecording(null);
    setRecordingDuration(0);
  }, [recording]);

  const confirmPendingAudio = useCallback(async () => {
    if (!pendingAudioUri) return;
    const uri = pendingAudioUri;
    setPendingAudioUri(null);
    const att = await uploadFile(
      uri,
      `audio_${Date.now()}.m4a`,
      "audio/mp4",
    );
    if (att) setAttachments((prev) => [...prev, att]);
  }, [pendingAudioUri, uploadFile]);

  const retryPendingAudio = useCallback(() => {
    setPendingAudioUri(null);
    setRecordingDuration(0);
    // Kick off a new recording right away.
    startRecording();
  }, [startRecording]);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Publish ─────────────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      await api.post("/posts", {
        type: postType,
        title: title.trim(),
        description: description.trim(),
        attachments: attachments.map((a) => ({
          type: a.type,
          url: a.url,
          name: a.name,
          size: a.size,
        })),
        linkPreview,
        eventDate: combineDateTime(eventDate, eventStartTime),
        eventEndDate: combineDateTime(eventEndDate, eventEndTime),
        eventLocation: null,
      });
      setStep("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  }, [
    postType,
    title,
    description,
    attachments,
    linkPreview,
    eventDate,
    eventEndDate,
    eventStartTime,
    eventEndTime,
  ]);

  const canAdvanceFromContent = title.trim().length > 0;
  const isEventType =
    postType === "event" || postType === "championship";

  if (step === "success") {
    return (
      <SuccessScreen
        title="Publicado!"
        message="Sua publicação foi enviada com sucesso."
        autoDismissMs={2000}
        onDismiss={onClose}
      />
    );
  }

  function fmtDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={
            step === "content"
              ? onClose
              : () => {
                  if (step === "media") setStep("content");
                  if (step === "schedule") setStep("media");
                }
          }
        >
          <Feather
            name="chevron-left"
            size={24}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Publicação</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 1: Content ── */}
        {step === "content" && (
          <>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = postType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.typeChip,
                      active && styles.typeChipActive,
                    ]}
                    onPress={() => setPostType(opt.key)}
                  >
                    <Feather
                      name={opt.icon}
                      size={16}
                      color={
                        active
                          ? colors.primaryForeground
                          : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>TÍTULO</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Dica de Treino"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.label}>DESCRIÇÃO</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="O que você quer compartilhar com a comunidade?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />

            {linkPreview && (
              <View style={styles.previewCard}>
                {linkPreview.image ? (
                  <Image
                    source={{ uri: linkPreview.image }}
                    style={styles.previewImage}
                  />
                ) : null}
                <View style={styles.previewText}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {linkPreview.title}
                  </Text>
                  <Text style={styles.previewDesc} numberOfLines={2}>
                    {linkPreview.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setLinkPreview(null)}
                  style={styles.previewClose}
                >
                  <Feather
                    name="x"
                    size={14}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}

        {/* ── Step 2: Media ── */}
        {step === "media" && (
          <>
            <Text style={styles.sectionTitle}>Mídia e Anexos</Text>
            <Text style={styles.sectionSub}>
              Adicione fotos, vídeos, arquivos ou áudio à sua publicação.
            </Text>

            <View style={styles.mediaGrid}>
              <TouchableOpacity
                style={styles.mediaBtn}
                activeOpacity={0.7}
                onPress={pickMedia}
                disabled={uploading}
              >
                <Feather
                  name="image"
                  size={28}
                  color={colors.mutedForeground}
                />
                <Text style={styles.mediaBtnText}>Foto / Vídeo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaBtn}
                activeOpacity={0.7}
                onPress={pickDocument}
                disabled={uploading}
              >
                <Feather
                  name="paperclip"
                  size={28}
                  color={colors.mutedForeground}
                />
                <Text style={styles.mediaBtnText}>Arquivo</Text>
              </TouchableOpacity>
            </View>

            {/* Audio recorder: recording → preview → button */}
            {recording ? (
              <View style={styles.audioRecording}>
                <View style={styles.audioRecordingDot} />
                <Text style={styles.audioRecordingTime}>
                  {fmtDuration(recordingDuration)}
                </Text>
                <TouchableOpacity
                  style={styles.audioStopBtn}
                  onPress={stopRecording}
                >
                  <Feather
                    name="check"
                    size={18}
                    color={colors.primaryForeground}
                  />
                  <Text style={styles.audioStopText}>Parar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.audioCancelBtn}
                  onPress={cancelRecording}
                >
                  <Feather name="x" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : pendingAudioUri ? (
              <AudioPreview
                uri={pendingAudioUri}
                onConfirm={confirmPendingAudio}
                onRetry={retryPendingAudio}
                disabled={uploading}
              />
            ) : (
              <TouchableOpacity
                style={styles.mediaBtnFull}
                activeOpacity={0.7}
                onPress={startRecording}
                disabled={uploading}
              >
                <Feather
                  name="mic"
                  size={28}
                  color={colors.mutedForeground}
                />
                <Text style={styles.mediaBtnText}>Gravar Áudio</Text>
              </TouchableOpacity>
            )}

            {/* Upload indicator */}
            {uploading && (
              <View style={styles.uploadingBar}>
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                />
                <Text style={styles.uploadingText}>
                  Enviando arquivo...
                </Text>
              </View>
            )}

            {/* Attachment chips */}
            {attachments.length > 0 && (
              <View style={styles.attachmentList}>
                <Text style={styles.previewLabel}>
                  ANEXOS ({attachments.length})
                </Text>
                {attachments.map((att, i) => (
                  <View key={`${att.url}_${i}`} style={styles.attachmentChip}>
                    <Feather
                      name={
                        att.type === "image"
                          ? "image"
                          : att.type === "voice"
                            ? "mic"
                            : "paperclip"
                      }
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={styles.attachmentName}
                      numberOfLines={1}
                    >
                      {att.name}
                    </Text>
                    <Text style={styles.attachmentSize}>
                      {(att.size / 1024).toFixed(0)} KB
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeAttachment(i)}
                      hitSlop={8}
                    >
                      <Feather
                        name="x"
                        size={14}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Preview */}
            <Text style={styles.previewLabel}>PRÉVIA</Text>
            <View style={styles.previewSummary}>
              <Text style={styles.previewSummaryTitle}>{title}</Text>
              <Text
                style={styles.previewSummaryDesc}
                numberOfLines={2}
              >
                {description}
              </Text>
              {attachments.length > 0 && (
                <Text style={styles.previewAttCount}>
                  📎 {attachments.length}{" "}
                  {attachments.length === 1 ? "anexo" : "anexos"}
                </Text>
              )}
            </View>
          </>
        )}

        {/* ── Step 3: Schedule ── */}
        {step === "schedule" && (
          <>
            <Text style={styles.sectionTitle}>Agendamento</Text>
            <Text style={styles.sectionSub}>
              Defina as datas e horários para o seu evento.
            </Text>

            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <Feather
                  name="calendar"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.scheduleHeaderText}>
                  Datas do Evento
                </Text>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <DateInput
                    label="Data de Início"
                    value={eventDate}
                    onChange={setEventDate}
                  />
                </View>
                <View style={styles.dateField}>
                  <TimeInput
                    label="Hora de Início"
                    value={eventStartTime}
                    onChange={setEventStartTime}
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <DateInput
                    label="Data de Término"
                    value={eventEndDate}
                    onChange={setEventEndDate}
                  />
                </View>
                <View style={styles.dateField}>
                  <TimeInput
                    label="Hora de Término"
                    value={eventEndTime}
                    onChange={setEventEndTime}
                  />
                </View>
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}
      </ScrollView>

      {/* Bottom action button */}
      <View style={styles.bottomBar}>
        {step === "content" && (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              !canAdvanceFromContent && styles.primaryBtnDisabled,
            ]}
            disabled={!canAdvanceFromContent}
            onPress={() => setStep("media")}
          >
            <Text style={styles.primaryBtnText}>Avançar</Text>
            <Feather
              name="arrow-right"
              size={18}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>
        )}

        {step === "media" && !isEventType && (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (publishing || uploading) && styles.primaryBtnDisabled,
            ]}
            disabled={publishing || uploading}
            onPress={handlePublish}
          >
            {publishing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Publicar</Text>
                <Feather
                  name="send"
                  size={18}
                  color={colors.primaryForeground}
                />
              </>
            )}
          </TouchableOpacity>
        )}

        {step === "media" && isEventType && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setStep("schedule")}
          >
            <Text style={styles.primaryBtnText}>
              Avançar para Agendamento
            </Text>
            <Feather
              name="arrow-right"
              size={18}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>
        )}

        {step === "schedule" && (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              publishing && styles.primaryBtnDisabled,
            ]}
            disabled={publishing}
            onPress={handlePublish}
          >
            {publishing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>
                  Publicar Evento
                </Text>
                <Feather
                  name="send"
                  size={18}
                  color={colors.primaryForeground}
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  headerSpacer: { width: 24 },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },

  // Type selector
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  typeChipTextActive: {
    color: colors.primaryForeground,
  },

  // Form fields
  label: {
    color: colors.mutedForeground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    height: inputHeight,
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
  error: {
    color: colors.error,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginTop: spacing.sm,
  },

  // Link preview
  previewCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  previewImage: { width: 80, height: 80 },
  previewText: { flex: 1, padding: spacing.sm, gap: 2 },
  previewTitle: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
  previewDesc: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  previewClose: { padding: spacing.sm },

  // Media step
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
  mediaBtnFull: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  mediaBtnText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },

  // Audio recording UI
  audioRecording: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    marginBottom: spacing.lg,
  },
  audioRecordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  audioRecordingTime: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  audioStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  audioStopText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
  audioCancelBtn: {
    padding: spacing.xs,
  },

  // Uploading
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

  // Attachment list
  attachmentList: {
    marginBottom: spacing.lg,
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
    marginBottom: spacing.xs,
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

  previewLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  previewSummary: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.md,
  },
  previewSummaryTitle: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  previewSummaryDesc: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginTop: 2,
  },
  previewAttCount: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  // Schedule step
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleHeaderText: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateField: { flex: 1, gap: spacing.xs },
  dateLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  dateInput: {
    height: inputHeight - 8,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 14,
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
});
