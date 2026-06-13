import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SuccessScreen } from "../../components/ui/SuccessScreen";

interface GraduationEntry {
  belt: string;
  degree: number;
  prajied?: number | null;
  status?: "pending" | "approved" | "rejected" | null;
  lockedByStudent?: boolean;
}

interface ProfileData {
  classIds: string[];
  graduation: Record<string, GraduationEntry> | null;
}

interface ClassOut {
  id: string;
  modality_name: string;
}

/** Modality name → slug (mirrors backend normalization). */
function modalitySlug(name: string): string {
  return (name || "").trim().toLowerCase().replace(/\s+/g, "-");
}

/** Modalities that graduate by belt/cord only (no degree, no prajied). */
const BELT_ONLY = new Set(["muay-thai", "capoeira"]);

const BELT_OPTIONS: Record<string, { label: string; color: string }[]> = {
  "Jiu-Jitsu": [
    { label: "Branca", color: "#FFFFFF" },
    { label: "Azul", color: "#2563EB" },
    { label: "Roxa", color: "#7C3AED" },
    { label: "Marrom", color: "#92400E" },
    { label: "Preta", color: "#222222" },
  ],
  "Muay Thai": [
    { label: "Branca", color: "#FFFFFF" },
    { label: "Amarela", color: "#EAB308" },
    { label: "Laranja", color: "#EA580C" },
    { label: "Verde", color: "#16A34A" },
    { label: "Azul", color: "#2563EB" },
    { label: "Roxa", color: "#7C3AED" },
    { label: "Marrom", color: "#92400E" },
    { label: "Vermelha", color: "#DC2626" },
    { label: "Preta", color: "#222222" },
  ],
  "Capoeira": [
    { label: "Crua", color: "#D4C5A9" },
    { label: "Amarela", color: "#EAB308" },
    { label: "Laranja", color: "#EA580C" },
    { label: "Azul", color: "#2563EB" },
    { label: "Verde", color: "#16A34A" },
    { label: "Roxa", color: "#7C3AED" },
    { label: "Marrom", color: "#92400E" },
    { label: "Vermelha", color: "#DC2626" },
    { label: "Branca", color: "#FFFFFF" },
  ],
};

function getDefaultBelts() {
  return BELT_OPTIONS["Jiu-Jitsu"]!;
}

interface GraduationScreenProps {
  onBack: () => void;
}

export function GraduationScreen({ onBack }: GraduationScreenProps) {
  const { actingAs } = useProxy();
  const [modalities, setModalities] = useState<string[]>([]);
  const [graduation, setGraduation] = useState<Record<string, GraduationEntry>>({});
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pickerModal, setPickerModal] = useState<{ slug: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "spartacus-artes-marciais";
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const [profile, classesRes] = await Promise.all([
        api.get<ProfileData>("/users/me/profile", { headers }),
        api.get<{ classes: ClassOut[] }>(`/projects/${projectId}/classes`),
      ]);

      // Extract unique modalities from enrolled classes
      const enrolled = new Set(profile.classIds);
      const mods = [...new Set(
        classesRes.classes
          .filter((c) => enrolled.has(c.id))
          .map((c) => c.modality_name),
      )];
      setModalities(mods);

      if (profile.graduation) {
        setGraduation(profile.graduation);
      }
    } catch { /* graceful */ }
  }, [actingAs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateField = (slug: string, field: keyof GraduationEntry, value: string | number) => {
    setGraduation((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? { belt: "", degree: 0 }), [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      await api.patch(
        "/users/me/graduation",
        { graduation },
        { headers },
      );
      setShowSuccess(true);
    } catch (err: unknown) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const belts = pickerModal
    ? (BELT_OPTIONS[pickerModal.name] ?? getDefaultBelts())
    : [];

  if (showSuccess) {
    return (
      <SuccessScreen
        title="Graduação atualizada!"
        onDismiss={onBack}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Feather name="chevron-left" size={24} color={colors.foreground} onPress={onBack} />
        <Text style={styles.headerTitle}>Graduação</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {modalities.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Nenhuma modalidade encontrada. Selecione turmas primeiro.
            </Text>
          </View>
        ) : (
          modalities.map((mod) => {
            const slug = modalitySlug(mod);
            const entry = graduation[slug] ?? { belt: "", degree: 0 };
            const beltOptions = BELT_OPTIONS[mod] ?? getDefaultBelts();
            const selectedBelt = beltOptions.find((b) => b.label === entry.belt);
            // Locked once inserted (pending) or approved; a rejected entry is
            // editable again so the student can correct and resubmit.
            const locked =
              entry.status === "pending" || entry.status === "approved";
            const rejected = entry.status === "rejected";
            const showDegree = slug === "jiu-jitsu" && !BELT_ONLY.has(slug);

            return (
              <View key={slug} style={styles.section}>
                <Text style={styles.modalityTitle}>{mod.toUpperCase()}</Text>

                {locked ? (
                  <View style={styles.lockedCard}>
                    <View style={styles.lockedRow}>
                      {selectedBelt && (
                        <View style={[styles.beltDot, { backgroundColor: selectedBelt.color }]} />
                      )}
                      <Text style={styles.lockedBelt}>
                        {entry.belt || "—"}
                        {showDegree && entry.degree ? ` · ${entry.degree}º grau` : ""}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusPill,
                      entry.status === "approved" ? styles.statusApproved : styles.statusPending,
                    ]}>
                      <Feather
                        name={entry.status === "approved" ? "check-circle" : "clock"}
                        size={12}
                        color={entry.status === "approved" ? colors.success : colors.primary}
                      />
                      <Text style={[
                        styles.statusText,
                        { color: entry.status === "approved" ? colors.success : colors.primary },
                      ]}>
                        {entry.status === "approved"
                          ? "Graduação aprovada"
                          : "Aguardando aprovação"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {rejected && (
                      <View style={styles.rejectedNote}>
                        <Feather name="alert-circle" size={13} color={colors.error} />
                        <Text style={styles.rejectedNoteText}>
                          Graduação não aprovada. Corrija e salve novamente.
                        </Text>
                      </View>
                    )}
                    <View style={styles.fieldRow}>
                    <View style={showDegree ? styles.fieldFlex : styles.fieldFull}>
                      <Text style={styles.fieldLabel}>Faixa</Text>
                      <TouchableOpacity style={styles.select}
                        onPress={() => setPickerModal({ slug, name: mod })}>
                        {selectedBelt && (
                          <View style={[styles.beltDot, { backgroundColor: selectedBelt.color }]} />
                        )}
                        <Text style={styles.selectText}>
                          {entry.belt || "Selecionar"}
                        </Text>
                        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>

                    {showDegree && (
                      <View style={styles.fieldSmall}>
                        <Input label="Grau" value={String(entry.degree || "")}
                          onChangeText={(v) => updateField(slug, "degree", parseInt(v) || 0)}
                          keyboardType="numeric" maxLength={1} />
                      </View>
                    )}
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}

        {modalities.some((m) => {
          const e = graduation[modalitySlug(m)];
          return !(e?.status === "pending" || e?.status === "approved");
        }) && (
          <Button label="Salvar" loading={saving} onPress={handleSave} style={styles.btn} />
        )}
      </ScrollView>

      {/* Belt picker modal */}
      <Modal visible={!!pickerModal} transparent animationType="fade"
        onRequestClose={() => setPickerModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setPickerModal(null)}>
          <View style={styles.pickerSheet}>
            {belts.map((b) => {
              const slug = pickerModal?.slug;
              const isSelected = !!slug && graduation[slug]?.belt === b.label;
              return (
                <TouchableOpacity key={b.label} style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                  onPress={() => {
                    if (slug) updateField(slug, "belt", b.label);
                    setPickerModal(null);
                  }}>
                  <View style={[styles.beltDot, { backgroundColor: b.color }]} />
                  <Text style={styles.pickerText}>{b.label}</Text>
                  {isSelected && <Feather name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1, textAlign: "center", color: colors.foreground,
    fontFamily: typography.fontHeadingSemi, fontSize: 17,
  },
  spacer: { width: 24 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  btn: { marginTop: spacing.xl },

  section: { marginBottom: spacing.lg },
  modalityTitle: {
    color: colors.primary, fontFamily: typography.fontHeading,
    fontSize: 14, letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  lockedCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.card ?? "rgba(255,255,255,0.03)",
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  lockedBelt: { color: colors.foreground, fontSize: 15, fontFamily: typography.fontBodyMedium },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm,
  },
  statusPending: { backgroundColor: colors.primaryMuted },
  statusApproved: { backgroundColor: "rgba(76,175,80,0.12)" },
  statusText: { fontSize: 11, fontFamily: typography.fontBodyMedium },
  rejectedNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(231,76,76,0.10)",
    borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm,
  },
  rejectedNoteText: { color: colors.error, fontSize: 12, flex: 1 },
  fieldRow: { flexDirection: "row", gap: spacing.sm },
  fieldFlex: { flex: 2 },
  fieldFull: { flex: 1 },
  fieldSmall: { flex: 1 },
  fieldLabel: {
    fontSize: 14, fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground, marginLeft: 4, marginBottom: spacing.xs,
  },
  select: {
    height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: "rgba(26,28,38,0.5)", flexDirection: "row",
    alignItems: "center", paddingHorizontal: 16, gap: spacing.sm,
  },
  selectText: { flex: 1, color: colors.foreground, fontFamily: typography.fontBody, fontSize: 16 },
  beltDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },

  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyText: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14, textAlign: "center" },

  // Picker modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", paddingHorizontal: spacing.xl },
  pickerSheet: { backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  pickerRowSelected: { backgroundColor: "rgba(198,163,78,0.1)" },
  pickerText: { flex: 1, color: colors.foreground, fontFamily: typography.fontBody, fontSize: 15 },
});
