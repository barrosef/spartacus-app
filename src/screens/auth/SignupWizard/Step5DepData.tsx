import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SafeScreen } from "../../../components/ui/SafeScreen";
import { WizardHeader } from "../../../components/wizard/WizardHeader";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { DateInput } from "../../../components/ui/DateInput";
import { useWizard } from "../../../context/WizardContext";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import type { AuthStackParamList } from "../../../navigation/types";

function calcAge(birthDate: string): number | null {
  const parts = birthDate.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1900) return null;
  const dob = new Date(year, month - 1, day);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function Step5DepData({ route }: { route?: { params?: AuthStackParamList["Step5DepData"] } }) {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();

  const editingId = route?.params?.dependentId;
  const editing = editingId
    ? state.dependents.find((d) => d.id === editingId)
    : undefined;

  const depCount = state.dependents.length;
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name ?? "");
  const [birthDate, setBirthDate] = useState(editing?.birthDate ?? "");
  const [gender, setGender] = useState<"male" | "female" | "">(editing?.gender ?? "");

  const age = calcAge(birthDate);
  const nameFirst = name.trim().split(" ")[0] || "dependente";

  function handleNext() {
    if (isEdit && editing) {
      dispatch({
        type: "UPDATE_DEPENDENT",
        payload: { ...editing, name, birthDate, gender: gender as "male" | "female" },
      });
      navigation.navigate("Step5DepClasses", { dependentId: editing.id });
    } else {
      const newId = `dep-${Date.now()}`;
      dispatch({
        type: "ADD_DEPENDENT",
        payload: { id: newId, name, birthDate, gender: gender as "male" | "female", classIds: [] },
      });
      navigation.navigate("Step5DepClasses", { dependentId: newId });
    }
  }

  const canContinue = name.trim().length >= 2 && birthDate.length === 10 && !!gender;

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={5}
        totalSteps={6}
        stepLabel={isEdit ? `Dep. ${depCount} · Dados` : `Dep. ${depCount + 1} · Dados`}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>
            {isEdit ? `Editar dependente` : `Dependente ${depCount + 1}`}
          </Text>
          <Text style={styles.description}>
            {isEdit
              ? `Atualize os dados de ${editing?.name.split(" ")[0]}.`
              : "Informe os dados do seu dependente."}
          </Text>

          {age !== null && age >= 0 && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>🎂 {age} anos</Text>
            </View>
          )}

          <View style={styles.fields}>
            <Input
              label="Nome completo"
              placeholder="Informe o nome do dependente"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

            <DateInput
              label="Data de nascimento"
              value={birthDate}
              onChange={setBirthDate}
              hint="Para menores de 18 anos"
            />

            <View>
              <Text style={styles.genderLabel}>Gênero</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderOption, gender === "male" && styles.genderOptionActive]}
                  onPress={() => setGender("male")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderText, gender === "male" && styles.genderTextActive]}>Masculino</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, gender === "female" && styles.genderOptionActive]}
                  onPress={() => setGender("female")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderText, gender === "female" && styles.genderTextActive]}>Feminino</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label={`Continuar → Turmas de ${nameFirst}`}
              onPress={handleNext}
              disabled={!canContinue}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontSize: 24,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  ageBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  ageBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
  },
  fields: {
    gap: spacing.md + 4,
  },
  genderLabel: {
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  genderOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  genderText: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  genderTextActive: {
    color: colors.primary,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
