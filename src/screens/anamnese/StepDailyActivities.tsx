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

const HOURS_OPTIONS = [
  { value: "less_than_20", label: "Menos de 20h" },
  { value: "20_to_40", label: "20 a 40h" },
  { value: "41_to_60", label: "41 a 60h" },
  { value: "more_than_60", label: "Mais de 60h" },
];

const ACTIVITY_OPTIONS = [
  { value: "sitting", label: "Sentado" },
  { value: "lifting_weights", label: "Carregando peso" },
  { value: "standing", label: "Em pé" },
  { value: "walking", label: "Caminhando" },
  { value: "driving", label: "Dirigindo" },
  { value: "other", label: "Outro" },
];

export function StepDailyActivities() {
  const { state, dispatch, userAge } = useAnamnese();
  const navigation = useAnamneseNavigation();

  const [hours, setHours] = useState(state.weeklyWorkHours);
  const [activities, setActivities] = useState<string[]>(state.workActivities);
  const [notes, setNotes] = useState(state.workActivitiesNotes);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = userAge >= 16 ? 5 : 4;

  function validate() {
    const e: Record<string, string> = {};
    if (!hours) e.hours = "Selecione uma opção";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    dispatch({
      type: "SET_DAILY_ACTIVITIES",
      payload: {
        weeklyWorkHours: hours,
        workActivities: activities,
        workActivitiesNotes: notes,
      },
    });
    navigation.navigate("StepMedicalHistory");
  }

  function toggleActivity(value: string) {
    setActivities((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={1}
        totalSteps={totalSteps}
        stepLabel="Etapa 1 · Atividades Diárias"
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
          <Text style={styles.heading}>Atividades diárias</Text>
          <Text style={styles.description}>
            Conte-nos sobre sua rotina de trabalho.
          </Text>

          <View style={styles.fields}>
            <ChipSelect
              label="Horas de trabalho por semana"
              options={HOURS_OPTIONS}
              selected={hours ? [hours] : []}
              onToggle={(v) => setHours(v)}
              multiple={false}
              error={errors.hours}
            />

            <ChipSelect
              label="Atividades no trabalho"
              options={ACTIVITY_OPTIONS}
              selected={activities}
              onToggle={toggleActivity}
            />

            <Input
              label="Observações (opcional)"
              placeholder="Outras atividades relevantes"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <View style={styles.footer}>
            <Button
              label="Continuar"
              onPress={handleNext}
              disabled={!hours}
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
