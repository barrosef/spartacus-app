import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { Button } from "../../components/ui/Button";
import {
  AnamneseSummary,
  type AnamneseSummaryData,
} from "../../components/anamnese/AnamneseSummary";
import { useAnamnese } from "../../context/AnamneseContext";
import {
  useAnamneseNavigation,
  useAnamneseTarget,
} from "../../navigation/AnamneseNavigator";
import { api } from "../../lib/api";
import { colors, typography, spacing } from "../../theme/tokens";

interface StepReviewProps {
  onSubmitted?: () => void;
}

export function StepReview({ onSubmitted }: StepReviewProps) {
  const { state, userAge } = useAnamnese();
  const navigation = useAnamneseNavigation();
  const target = useAnamneseTarget();

  const totalSteps = userAge >= 16 ? 5 : 4;
  const currentStep = totalSteps;

  const [loading, setLoading] = useState(false);

  function buildPayload(): AnamneseSummaryData {
    const payload: AnamneseSummaryData = {
      medicalHistory: {
        lastMedicalExamDate: state.lastMedicalExamDate,
        familyHeartDisease: state.familyHeartDisease,
        surgeries: state.surgeries,
        surgeriesOther: state.surgeriesOther,
        diagnosedConditions: state.diagnosedConditions,
        diagnosedConditionsOther: state.diagnosedConditionsOther,
        currentMedications: state.currentMedications,
        symptoms: state.symptoms,
        hasAllergies: state.hasAllergies ?? false,
        allergiesDetails: state.allergiesDetails,
        hasRecentInjury: state.hasRecentInjury ?? false,
        injuryDetails: state.injuryDetails,
        hasExerciseRestriction: state.hasExerciseRestriction ?? false,
        restrictionDetails: state.restrictionDetails,
      },
      healthBehavior: {
        smokes: state.smokes ?? false,
        cigarettesPerDay: state.cigarettesPerDay,
        practicesPhysicalActivity: state.practicesPhysicalActivity ?? false,
        physicalActivityDescription: state.physicalActivityDescription,
        physicalActivityFrequency: state.physicalActivityFrequency,
        physicalActivityDuration: state.physicalActivityDuration,
      },
      goals: state.goals,
      goalsOther: state.goalsOther,
      generalComments: state.generalComments,
    };

    if (userAge >= 16) {
      payload.dailyActivities = {
        weeklyWorkHours: state.weeklyWorkHours,
        workActivities: state.workActivities,
        workActivitiesNotes: state.workActivitiesNotes,
      };
    }

    return payload;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (!target.current.isSelf) {
        headers["X-Acting-As"] = target.current.uid;
      }
      await api.post("/medical-history", buildPayload(), { headers });
      onSubmitted?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      Alert.alert("Erro ao enviar", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabel={`Etapa ${currentStep} · Confirmação`}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Confirme sua ficha</Text>
        <Text style={styles.description}>
          Confira os dados abaixo. Toque em voltar para editar qualquer etapa.
        </Text>

        <AnamneseSummary data={buildPayload()} />

        <View style={styles.footer}>
          <Button label="Enviar anamnese" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
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
  footer: {
    marginTop: spacing.xl,
  },
});
