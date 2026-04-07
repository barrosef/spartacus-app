import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAnamnese } from "../../context/AnamneseContext";
import {
  useAnamneseNavigation,
  useAnamneseTarget,
} from "../../navigation/AnamneseNavigator";
import { api } from "../../lib/api";
import { colors, typography, spacing, radius } from "../../theme/tokens";

const CONDITION_LABELS: Record<string, string> = {
  alcoholism: "Alcoolismo",
  kidney_disease: "Doença renal",
  emphysema: "Enfisema",
  anemia: "Anemia",
  arthritis: "Artrite",
  eye_problems: "Problemas oculares",
  ulcer: "Úlcera",
  asthma: "Asma",
  diabetes: "Diabetes",
  high_blood_pressure: "Pressão alta",
  stroke: "AVC",
  obesity: "Obesidade",
  muscle_problems: "Problemas musculares",
  other: "Outro",
};

const GOAL_LABELS: Record<string, string> = {
  discipline: "Disciplina",
  self_defense: "Defesa pessoal",
  socialization: "Socialização",
  health: "Saúde",
  competition: "Competição",
  physical_conditioning: "Condicionamento físico",
  therapeutic: "Terapêutico",
  leisure: "Lazer",
  other: "Outro",
};

function translateList(
  keys: string[],
  map: Record<string, string>,
): string {
  return keys.map((k) => map[k] ?? k).join(", ");
}

interface StepReviewProps {
  onSubmitted?: () => void;
}

export function StepReview({ onSubmitted }: StepReviewProps) {
  const { state, dispatch, userAge } = useAnamnese();
  const navigation = useAnamneseNavigation();
  const target = useAnamneseTarget();

  const totalSteps = userAge >= 16 ? 5 : 4;
  const currentStep = totalSteps;

  const [comments, setComments] = useState(state.generalComments);
  const [loading, setLoading] = useState(false);

  function buildPayload() {
    const payload: Record<string, unknown> = {
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
      generalComments: comments,
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
    dispatch({ type: "SET_COMMENTS", payload: { generalComments: comments } });
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
        stepLabel={`Etapa ${currentStep} · Revisão`}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Revisão</Text>
        <Text style={styles.description}>
          Revise suas informações e adicione comentários se desejar.
        </Text>

        <View style={styles.fields}>
          <Input
            label="Comentários gerais (opcional)"
            placeholder="Algo mais que gostaria de informar?"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />

          {/* Summary sections */}
          {userAge >= 16 && state.weeklyWorkHours && (
            <SummarySection title="Atividades Diárias">
              <Row label="Horas de trabalho" value={state.weeklyWorkHours} />
              {state.workActivities.length > 0 && (
                <Row label="Atividades" value={state.workActivities.join(", ")} />
              )}
            </SummarySection>
          )}

          <SummarySection title="Histórico Médico">
            {state.lastMedicalExamDate && (
              <Row label="Último exame" value={state.lastMedicalExamDate} />
            )}
            {state.diagnosedConditions.length > 0 && (
              <Row label="Condições" value={translateList(state.diagnosedConditions, CONDITION_LABELS)} />
            )}
            {state.currentMedications && (
              <Row label="Medicamentos" value={state.currentMedications} />
            )}
            <Row
              label="Alergias"
              value={state.hasAllergies ? state.allergiesDetails || "Sim" : "Não"}
            />
            <Row
              label="Lesão recente"
              value={state.hasRecentInjury ? state.injuryDetails || "Sim" : "Não"}
            />
            <Row
              label="Restrição"
              value={state.hasExerciseRestriction ? state.restrictionDetails || "Sim" : "Não"}
            />
          </SummarySection>

          <SummarySection title="Saúde">
            {userAge >= 14 && (
              <Row label="Fuma" value={state.smokes ? `Sim (${state.cigarettesPerDay}/dia)` : "Não"} />
            )}
            <Row
              label="Atividade física"
              value={
                state.practicesPhysicalActivity
                  ? state.physicalActivityDescription || "Sim"
                  : "Não"
              }
            />
          </SummarySection>

          <SummarySection title="Objetivos">
            <Row label="Selecionados" value={translateList(state.goals, GOAL_LABELS)} />
            {state.goalsOther && <Row label="Outro" value={state.goalsOther} />}
          </SummarySection>
        </View>

        <View style={styles.footer}>
          <Button
            label="Enviar anamnese"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  section: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: "rgba(198,163,78,0.06)",
  },
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: colors.foreground,
    flex: 2,
    textAlign: "right",
  },
  footer: {
    marginTop: spacing.xl,
  },
});
