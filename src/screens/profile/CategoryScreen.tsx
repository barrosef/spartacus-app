import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface CompetitionData {
  weightKg: number | null;
  targetCategories: string[];
  calculatedAgeCategory: string | null;
  calculatedWeightCategory: string | null;
}

interface ProfileData {
  birthDate?: string | null;
  competition: CompetitionData | null;
}

interface CategoryConfig {
  ageCategories: { name: string; minAge: number; maxAge: number | null }[];
  weightCategories: { name: string; minWeight: number; maxWeight: number | null }[];
}

interface CategoryScreenProps {
  onBack: () => void;
}

export function CategoryScreen({ onBack }: CategoryScreenProps) {
  const [weight, setWeight] = useState("");
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [ageCategory, setAgeCategory] = useState<string | null>(null);
  const [weightCategory, setWeightCategory] = useState<string | null>(null);
  const [weightOptions, setWeightOptions] = useState<{ name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "spartacus-artes-marciais";
      const [profile, configRes] = await Promise.all([
        api.get<ProfileData>("/users/me/profile"),
        api.get<{ categoryConfig?: CategoryConfig }>(
          `/projects/${projectId}`,
        ).catch(() => ({ categoryConfig: undefined })),
      ]);

      if (profile.competition) {
        setWeight(profile.competition.weightKg?.toString() ?? "");
        setTargets(new Set(profile.competition.targetCategories));
        setAgeCategory(profile.competition.calculatedAgeCategory);
        setWeightCategory(profile.competition.calculatedWeightCategory);
      }

      if (configRes.categoryConfig) {
        setWeightOptions(configRes.categoryConfig.weightCategories);
      }
    } catch { /* graceful */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTarget = (name: string) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSave = async () => {
    const w = parseFloat(weight);
    if (weight && (isNaN(w) || w <= 0)) {
      Alert.alert("Informe um peso válido");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/users/me/competition", {
        weightKg: w || null,
        targetCategories: Array.from(targets),
      });
      Alert.alert("Categoria atualizada");
      onBack();
    } catch (err: unknown) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Feather name="chevron-left" size={24} color={colors.foreground} onPress={onBack} />
        <Text style={styles.headerTitle}>Categoria</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {ageCategory && (
          <>
            <Text style={styles.label}>Sua categoria (calculada):</Text>
            <View style={styles.calcCard}>
              <Feather name="tag" size={16} color={colors.primary} />
              <Text style={styles.calcText}>{ageCategory}</Text>
            </View>
          </>
        )}

        <Input
          label="Peso atual (kg)"
          value={weight}
          onChangeText={setWeight}
          placeholder="Ex: 78.5"
          keyboardType="decimal-pad"
          maxLength={6}
        />

        {weightCategory && (
          <>
            <Text style={styles.label}>Categoria de peso:</Text>
            <View style={styles.calcCard}>
              <Feather name="tag" size={16} color={colors.primary} />
              <Text style={styles.calcText}>{weightCategory}</Text>
            </View>
          </>
        )}

        {weightOptions.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: spacing.lg }]}>
              Categorias que busca competir:
            </Text>
            <View style={styles.checkList}>
              {weightOptions.map((cat) => {
                const checked = targets.has(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={styles.checkRow}
                    activeOpacity={0.7}
                    onPress={() => toggleTarget(cat.name)}
                  >
                    <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
                      {checked && <Feather name="check" size={14} color={colors.primaryForeground} />}
                    </View>
                    <Text style={styles.checkLabel}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Button label="Salvar" loading={saving} onPress={handleSave} style={styles.btn} />
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
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  btn: { marginTop: spacing.lg },

  label: {
    color: colors.foreground, fontFamily: typography.fontBodyMedium,
    fontSize: 14, marginLeft: 4,
  },
  calcCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  calcText: { color: colors.foreground, fontFamily: typography.fontBodySemiBold, fontSize: 15 },

  checkList: { gap: spacing.sm },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 4, paddingVertical: spacing.xs + 2 },
  checkBox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  checkBoxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { color: colors.foreground, fontFamily: typography.fontBody, fontSize: 15 },
});
