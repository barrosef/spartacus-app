import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { useClasses } from "../../hooks/useClasses";
import { SelecaoTurmasScreen } from "../../components/wizard/SelecaoTurmasScreen";
import { Button } from "../../components/ui/Button";
import { SuccessScreen } from "../../components/ui/SuccessScreen";
import { useDialog } from "../../components/ui/DialogProvider";
import type { ClassOption } from "../../context/WizardContext";

interface ProfileData {
  name: string;
  classIds: string[];
  classNames: string[];
  roles: string[];
}

type SubScreen = "view" | "edit" | "confirm" | "success";

interface ClassesScreenProps {
  onBack: () => void;
}

export function ClassesScreen({ onBack }: ClassesScreenProps) {
  const { actingAs } = useProxy();
  const dialog = useDialog();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sub, setSub] = useState<SubScreen>("view");
  const [newSelection, setNewSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { classes, loading: classesLoading, error: classesError } = useClasses();

  const fetchProfile = useCallback(async () => {
    setLoadError(false);
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<ProfileData>(
        "/users/me/profile",
        { headers },
      );
      setProfile(data);
    } catch {
      setLoadError(true);
    }
  }, [actingAs]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (!profile) {
    // Error state with retry — a failed read must not leave a blank screen forever.
    if (loadError) {
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.header}>
            <Feather name="chevron-left" size={24} color={colors.foreground}
              onPress={onBack} />
            <Text style={styles.headerTitle}>Turmas e modalidades</Text>
            <View style={styles.spacer} />
          </View>
          <View style={styles.center}>
            <View style={styles.errorIcon}>
              <Feather name="alert-circle" size={28} color={colors.error} />
            </View>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorMsg}>
              Não foi possível buscar suas turmas.
            </Text>
            <Button label="Tentar novamente" onPress={fetchProfile} style={styles.btn} />
          </View>
        </SafeAreaView>
      );
    }
    return <SafeAreaView style={styles.safe}><View style={styles.safe} /></SafeAreaView>;
  }

  if (sub === "success") {
    return (
      <SuccessScreen
        title="Turmas atualizadas!"
        onDismiss={onBack}
      />
    );
  }

  // ── Edit: reuse SelecaoTurmasScreen ──
  if (sub === "edit") {
    return (
      <SelecaoTurmasScreen
        contextType="self"
        personName={profile.name}
        roleLabel="Aluno"
        classes={classes}
        loading={classesLoading}
        error={classesError}
        initialSelection={profile.classIds}
        currentStep={1}
        totalSteps={2}
        stepLabel="Selecionar turmas"
        onBack={() => setSub("view")}
        onConfirm={(ids) => {
          setNewSelection(ids);
          setSub("confirm");
        }}
      />
    );
  }

  // ── Confirm changes ──
  if (sub === "confirm") {
    const currentSet = new Set(profile.classIds);
    const newSet = new Set(newSelection);
    const classMap = new Map<string, ClassOption>();
    classes.forEach((c) => classMap.set(c.id, c));

    const added = newSelection.filter((id) => !currentSet.has(id));
    const removed = profile.classIds.filter((id) => !newSet.has(id));
    const kept = profile.classIds.filter((id) => newSet.has(id));

    const handleConfirm = async () => {
      setSaving(true);
      try {
        const headers: Record<string, string> = {};
        if (actingAs) headers["X-Acting-As"] = actingAs;
        await api.patch(
          "/users/me/classes",
          { classIds: newSelection },
          { headers },
        );
        setSub("success");
      } catch (err: unknown) {
        dialog.alert({ title: "Erro", message: err instanceof Error ? err.message : "Erro ao salvar", tone: "danger" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Feather name="chevron-left" size={24} color={colors.foreground}
            onPress={() => setSub("edit")} />
          <Text style={styles.headerTitle}>Confirmar alterações</Text>
          <View style={styles.spacer} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {removed.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Turmas que serão REMOVIDAS:</Text>
              {removed.map((id) => {
                const c = classMap.get(id);
                return (
                  <View key={id} style={[styles.diffCard, styles.diffRemoved]}>
                    <Text style={styles.diffIcon}>✕</Text>
                    <View style={styles.diffText}>
                      <Text style={styles.diffName}>{c?.name ?? id}</Text>
                      {c && <Text style={styles.diffInfo}>{c.schedule}</Text>}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {added.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Turmas que serão ADICIONADAS:</Text>
              {added.map((id) => {
                const c = classMap.get(id);
                return (
                  <View key={id} style={[styles.diffCard, styles.diffAdded]}>
                    <Text style={styles.diffIconAdd}>+</Text>
                    <View style={styles.diffText}>
                      <Text style={styles.diffName}>{c?.name ?? id}</Text>
                      {c && <Text style={styles.diffInfo}>{c.schedule}</Text>}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {kept.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Turmas que permanecem:</Text>
              {kept.map((id) => {
                const c = classMap.get(id);
                return (
                  <View key={id} style={[styles.diffCard, styles.diffKept]}>
                    <Text style={styles.diffIconKept}>●</Text>
                    <View style={styles.diffText}>
                      <Text style={styles.diffName}>{c?.name ?? id}</Text>
                      {c && <Text style={styles.diffInfo}>{c.schedule}</Text>}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <Button label="Confirmar alterações" loading={saving}
            onPress={handleConfirm} style={styles.btn} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── View current classes ──
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Feather name="chevron-left" size={24} color={colors.foreground}
          onPress={onBack} />
        <Text style={styles.headerTitle}>Turmas e modalidades</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {profile.classIds.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma turma selecionada.</Text>
          </View>
        ) : (
          profile.classIds.map((id, i) => {
            const c = classes.find((cl) => cl.id === id);
            return (
              <View key={id} style={styles.classCard}>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{c?.name ?? profile.classNames[i] ?? id}</Text>
                  {c && <Text style={styles.classSub}>{c.modality} · {c.schedule}</Text>}
                  {c?.teacher && <Text style={styles.classSub}>Prof. {c.teacher}</Text>}
                </View>
              </View>
            );
          })
        )}

        <Button label="Alterar turmas" variant="outline"
          onPress={() => setSub("edit")} style={styles.btn} />
      </ScrollView>
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
  scroll: { padding: spacing.md, gap: spacing.sm },
  btn: { marginTop: spacing.lg },

  // View
  classCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  classInfo: { gap: 2 },
  className: { color: colors.foreground, fontFamily: typography.fontBodySemiBold, fontSize: 15 },
  classSub: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyText: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14 },

  // Error state
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorIcon: {
    width: 56, height: 56, borderRadius: 28, marginBottom: spacing.md,
    backgroundColor: "rgba(231,76,76,0.10)", alignItems: "center", justifyContent: "center",
  },
  errorTitle: {
    color: colors.foreground, fontFamily: typography.fontHeadingSemi,
    fontSize: 17, marginBottom: spacing.xs,
  },
  errorMsg: {
    color: colors.mutedForeground, fontFamily: typography.fontBody,
    fontSize: 14, textAlign: "center", marginBottom: spacing.lg,
  },

  // Confirm diff
  sectionLabel: {
    color: colors.foreground, fontFamily: typography.fontBodySemiBold,
    fontSize: 14, marginTop: spacing.md, marginBottom: spacing.xs,
  },
  diffCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderRadius: radius.md, padding: spacing.md,
  },
  diffRemoved: { backgroundColor: "rgba(239,68,68,0.1)" },
  diffAdded: { backgroundColor: "rgba(76,175,80,0.1)" },
  diffKept: { backgroundColor: colors.card },
  diffIcon: { color: colors.error, fontFamily: typography.fontHeadingSemi, fontSize: 16, width: 20, textAlign: "center" },
  diffIconAdd: { color: colors.success, fontFamily: typography.fontHeadingSemi, fontSize: 18, width: 20, textAlign: "center" },
  diffIconKept: { color: colors.mutedForeground, fontSize: 10, width: 20, textAlign: "center" },
  diffText: { flex: 1 },
  diffName: { color: colors.foreground, fontFamily: typography.fontBodySemiBold, fontSize: 14 },
  diffInfo: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 12 },
});
