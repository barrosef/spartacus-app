import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  radius,
  inputHeight,
  buttonHeight,
} from "../../theme/tokens";
import { api } from "../../lib/api";
import { SuccessScreen } from "../../components/ui/SuccessScreen";

type PostType = "post" | "event" | "championship";
type Step = "content" | "media" | "schedule" | "success";

interface PostWizardScreenProps {
  onClose: () => void;
}

const TYPE_OPTIONS: { key: PostType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "post", label: "Post", icon: "edit-3" },
  { key: "event", label: "Evento", icon: "calendar" },
  { key: "championship", label: "Camp.", icon: "award" },
];

export function PostWizardScreen({ onClose }: PostWizardScreenProps) {
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
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect URLs in description and fetch preview
  const handleDescriptionChange = useCallback(
    async (text: string) => {
      setDescription(text);
      const urlMatch = text.match(
        /https?:\/\/[^\s]+/
      );
      if (urlMatch && !linkPreview) {
        try {
          const preview = await api.get<{
            url: string;
            title: string;
            image: string;
            description: string;
          }>(`/timeline/link-preview?url=${encodeURIComponent(urlMatch[0])}`);
          if (preview.title) setLinkPreview(preview);
        } catch {
          // Silent fail
        }
      }
    },
    [linkPreview]
  );

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
        attachments: [],
        linkPreview: linkPreview,
        eventDate: eventDate || null,
        eventEndDate: eventEndDate || null,
        eventLocation: null,
      });
      setStep("success");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Erro ao publicar";
      setError(msg);
    } finally {
      setPublishing(false);
    }
  }, [postType, title, description, linkPreview, eventDate, eventEndDate]);

  const canAdvanceFromContent = title.trim().length > 0;
  const canAdvanceFromMedia = true;
  const isEventType = postType === "event" || postType === "championship";

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={step === "content" ? onClose : () => {
          if (step === "media") setStep("content");
          if (step === "schedule") setStep("media");
        }}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
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
            {/* Type selector */}
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = postType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setPostType(opt.key)}
                  >
                    <Feather
                      name={opt.icon}
                      size={16}
                      color={active ? colors.primaryForeground : colors.mutedForeground}
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

            {/* Title */}
            <Text style={styles.label}>TÍTULO</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Dica de Treino"
              placeholderTextColor={colors.mutedForeground}
            />

            {/* Description */}
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

            {/* Link preview */}
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
                  <Feather name="x" size={14} color={colors.mutedForeground} />
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
              <TouchableOpacity style={styles.mediaBtn}>
                <Feather name="image" size={28} color={colors.mutedForeground} />
                <Text style={styles.mediaBtnText}>Foto / Vídeo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn}>
                <Feather name="paperclip" size={28} color={colors.mutedForeground} />
                <Text style={styles.mediaBtnText}>Arquivo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.mediaBtnFull}>
              <Feather name="mic" size={28} color={colors.mutedForeground} />
              <Text style={styles.mediaBtnText}>Gravar Áudio</Text>
            </TouchableOpacity>

            {/* Preview section */}
            <Text style={styles.previewLabel}>PRÉVIA</Text>
            <View style={styles.previewSummary}>
              <Text style={styles.previewSummaryTitle}>{title}</Text>
              <Text style={styles.previewSummaryDesc} numberOfLines={2}>
                {description}
              </Text>
            </View>
          </>
        )}

        {/* ── Step 3: Schedule (event/championship only) ── */}
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
                  <Text style={styles.dateLabel}>Data de Início</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={eventDate}
                    onChangeText={setEventDate}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Hora de Início</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="--:--"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Data de Término</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={eventEndDate}
                    onChangeText={setEventEndDate}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Hora de Término</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="--:--"
                    placeholderTextColor={colors.mutedForeground}
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
            style={styles.primaryBtn}
            disabled={publishing}
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
            style={styles.primaryBtn}
            disabled={publishing}
            onPress={handlePublish}
          >
            {publishing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Publicar Evento</Text>
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
  previewImage: {
    width: 80,
    height: 80,
  },
  previewText: {
    flex: 1,
    padding: spacing.sm,
    gap: 2,
  },
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
  previewClose: {
    padding: spacing.sm,
  },

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
  dateField: {
    flex: 1,
    gap: spacing.xs,
  },
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
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 16,
  },
});
