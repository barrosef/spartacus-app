import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ChipSelect } from "../../components/ui/ChipSelect";
import { useAnamnese } from "../../context/AnamneseContext";
import { useAnamneseNavigation } from "../../navigation/AnamneseNavigator";
import { colors, typography, spacing } from "../../theme/tokens";

const GOAL_OPTIONS = [
  { value: "discipline", label: "Disciplina" },
  { value: "self_defense", label: "Defesa pessoal" },
  { value: "socialization", label: "Socialização" },
  { value: "health", label: "Saúde" },
  { value: "competition", label: "Competição" },
  { value: "physical_conditioning", label: "Condicionamento físico" },
  { value: "therapeutic", label: "Terapêutico" },
  { value: "leisure", label: "Lazer" },
  { value: "other", label: "Outro" },
];

export function StepGoals() {
  const { state, dispatch, userAge } = useAnamnese();
  const navigation = useAnamneseNavigation();

  const totalSteps = userAge >= 16 ? 5 : 4;
  const currentStep = userAge >= 16 ? 4 : 3;

  const [goals, setGoals] = useState<string[]>(state.goals);
  const [goalsOther, setGoalsOther] = useState(state.goalsOther);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleGoal(value: string) {
    setGoals((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (goals.length === 0) e.goals = "Selecione ao menos um objetivo";
    if (goals.includes("other") && !goalsOther.trim()) e.goalsOther = "Descreva o objetivo";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    dispatch({
      type: "SET_GOALS",
      payload: { goals, goalsOther },
    });
    navigation.navigate("StepReview");
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabel={`Etapa ${currentStep} · Objetivos`}
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
          <Text style={styles.heading}>Objetivos</Text>
          <Text style={styles.description}>
            O que te motiva a praticar artes marciais?
          </Text>

          <View style={styles.fields}>
            <ChipSelect
              label="Selecione seus objetivos"
              options={GOAL_OPTIONS}
              selected={goals}
              onToggle={toggleGoal}
              error={errors.goals}
            />

            {goals.includes("other") && (
              <Input
                label="Descreva o outro objetivo"
                value={goalsOther}
                onChangeText={setGoalsOther}
                error={errors.goalsOther}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Button
              label="Continuar"
              onPress={handleNext}
              disabled={goals.length === 0}
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
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  fields: {
    gap: spacing.md + 4,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
