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
import { YesNoToggle } from "../../components/ui/YesNoToggle";
import { useAnamnese } from "../../context/AnamneseContext";
import { useAnamneseNavigation } from "../../navigation/AnamneseNavigator";
import { colors, typography, spacing } from "../../theme/tokens";

export function StepHealthBehavior() {
  const { state, dispatch, userAge } = useAnamnese();
  const navigation = useAnamneseNavigation();

  const totalSteps = userAge >= 16 ? 5 : 4;
  const currentStep = userAge >= 16 ? 3 : 2;
  const showSmokes = userAge >= 14;

  const [smokes, setSmokes] = useState<boolean | null>(state.smokes);
  const [cigarettesPerDay, setCigarettesPerDay] = useState(state.cigarettesPerDay);
  const [active, setActive] = useState<boolean | null>(state.practicesPhysicalActivity);
  const [actDescription, setActDescription] = useState(state.physicalActivityDescription);
  const [actFrequency, setActFrequency] = useState(state.physicalActivityFrequency);
  const [actDuration, setActDuration] = useState(state.physicalActivityDuration);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (showSmokes && smokes === null) e.smokes = "Informe se fuma";
    if (smokes && !cigarettesPerDay.trim()) e.cigarettes = "Informe a quantidade";
    if (active === null) e.active = "Informe se pratica atividade";
    if (active && !actDescription.trim()) e.description = "Descreva a atividade";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    dispatch({
      type: "SET_HEALTH_BEHAVIOR",
      payload: {
        smokes: smokes ?? false,
        cigarettesPerDay,
        practicesPhysicalActivity: active ?? false,
        physicalActivityDescription: actDescription,
        physicalActivityFrequency: actFrequency,
        physicalActivityDuration: actDuration,
      },
    });
    navigation.navigate("StepGoals");
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabel={`Etapa ${currentStep} · Saúde`}
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
          <Text style={styles.heading}>Comportamento de saúde</Text>
          <Text style={styles.description}>
            Informações sobre seus hábitos atuais.
          </Text>

          <View style={styles.fields}>
            {showSmokes && (
              <>
                <YesNoToggle
                  label="Fuma?"
                  value={smokes}
                  onChange={setSmokes}
                  error={errors.smokes}
                />
                {smokes && (
                  <Input
                    label="Cigarros por dia"
                    placeholder="Ex: 10"
                    keyboardType="numeric"
                    value={cigarettesPerDay}
                    onChangeText={setCigarettesPerDay}
                    error={errors.cigarettes}
                  />
                )}
              </>
            )}

            <YesNoToggle
              label="Pratica atividade física?"
              value={active}
              onChange={setActive}
              error={errors.active}
            />
            {active && (
              <>
                <Input
                  label="Qual atividade?"
                  placeholder="Ex: Caminhada, corrida"
                  value={actDescription}
                  onChangeText={setActDescription}
                  error={errors.description}
                />
                <Input
                  label="Frequência (opcional)"
                  placeholder="Ex: 3x por semana"
                  value={actFrequency}
                  onChangeText={setActFrequency}
                />
                <Input
                  label="Duração (opcional)"
                  placeholder="Ex: 30 minutos"
                  value={actDuration}
                  onChangeText={setActDuration}
                />
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Button label="Continuar" onPress={handleNext} />
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
