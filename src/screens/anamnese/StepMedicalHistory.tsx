import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  findNodeHandle,
} from "react-native";
import { SafeScreen } from "../../components/ui/SafeScreen";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { DateInput } from "../../components/ui/DateInput";
import { ChipSelect } from "../../components/ui/ChipSelect";
import { YesNoToggle } from "../../components/ui/YesNoToggle";
import { SymptomRow } from "../../components/ui/SymptomRow";
import { useAnamnese } from "../../context/AnamneseContext";
import { useAnamneseNavigation } from "../../navigation/AnamneseNavigator";
import { colors, typography, spacing, radius } from "../../theme/tokens";

type Frequency = "always" | "sometimes" | "never" | "";

const FAMILY_OPTIONS = [
  { value: "father", label: "Pai" },
  { value: "mother", label: "Mãe" },
  { value: "sibling", label: "Irmão/Irmã" },
  { value: "grandparent", label: "Avô/Avó" },
];

const SURGERY_OPTIONS = [
  { value: "spine", label: "Coluna" },
  { value: "heart", label: "Coração" },
  { value: "joint", label: "Articulação" },
  { value: "herniated_disc", label: "Hérnia de disco" },
  { value: "kidney", label: "Rim" },
  { value: "lung", label: "Pulmão" },
  { value: "eyes", label: "Olhos" },
  { value: "other", label: "Outra" },
];

const CONDITION_OPTIONS = [
  { value: "high_blood_pressure", label: "Hipertensão" },
  { value: "diabetes", label: "Diabetes" },
  { value: "asthma", label: "Asma" },
  { value: "arthritis", label: "Artrite" },
  { value: "obesity", label: "Obesidade" },
  { value: "anemia", label: "Anemia" },
  { value: "stroke", label: "AVC" },
  { value: "kidney_disease", label: "Doença renal" },
  { value: "emphysema", label: "Enfisema" },
  { value: "ulcer", label: "Úlcera" },
  { value: "eye_problems", label: "Problemas oculares" },
  { value: "muscle_problems", label: "Problemas musculares" },
  { value: "alcoholism", label: "Alcoolismo" },
  { value: "other", label: "Outra" },
];

const SYMPTOMS: { key: string; label: string }[] = [
  { key: "coughingBlood", label: "Tosse com sangue" },
  { key: "abdominalPain", label: "Dor abdominal" },
  { key: "legPain", label: "Dor nas pernas" },
  { key: "armPain", label: "Dor nos braços" },
  { key: "backNeckPain", label: "Dor nas costas ou pescoço" },
  { key: "chestPain", label: "Dor no peito" },
  { key: "jointPain", label: "Dores articulares" },
  { key: "shortnessOfBreath", label: "Falta de ar com esforço leve" },
  { key: "feelingWeak", label: "Sentir-se fraco" },
  { key: "dizziness", label: "Tontura" },
  { key: "heartPalpitation", label: "Palpitação cardíaca" },
];

export function StepMedicalHistory() {
  const { state, dispatch, userAge } = useAnamnese();
  const navigation = useAnamneseNavigation();

  const totalSteps = userAge >= 16 ? 5 : 4;
  const currentStep = userAge >= 16 ? 2 : 1;

  const [examDate, setExamDate] = useState(state.lastMedicalExamDate);
  const [family, setFamily] = useState<string[]>(state.familyHeartDisease);
  const [surgeries, setSurgeries] = useState<string[]>(state.surgeries);
  const [surgeriesOther, setSurgeriesOther] = useState(state.surgeriesOther);
  const [conditions, setConditions] = useState<string[]>(state.diagnosedConditions);
  const [conditionsOther, setConditionsOther] = useState(state.diagnosedConditionsOther);
  const [medications, setMedications] = useState(state.currentMedications);
  const [symptoms, setSymptoms] = useState<Record<string, Frequency>>(state.symptoms);
  const [hasAllergies, setHasAllergies] = useState<boolean | null>(state.hasAllergies);
  const [allergiesDetails, setAllergiesDetails] = useState(state.allergiesDetails);
  const [hasInjury, setHasInjury] = useState<boolean | null>(state.hasRecentInjury);
  const [injuryDetails, setInjuryDetails] = useState(state.injuryDetails);
  const [hasRestriction, setHasRestriction] = useState<boolean | null>(state.hasExerciseRestriction);
  const [restrictionDetails, setRestrictionDetails] = useState(state.restrictionDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Scroll-to-first-error plumbing: each error-capable field registers a
  // ref keyed by its error name; on a failed validation we measure the
  // errored fields against the scroll content and scroll to the topmost one.
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});
  const setFieldRef = (key: string) => (node: View | null) => {
    fieldRefs.current[key] = node;
  };

  function scrollToFirstError(keys: string[]) {
    const content = contentRef.current;
    const contentHandle = content ? findNodeHandle(content) : null;
    if (contentHandle == null) return;
    const nodes = keys
      .map((k) => fieldRefs.current[k])
      .filter((n): n is View => !!n);
    if (nodes.length === 0) return;
    Promise.all(
      nodes.map(
        (node) =>
          new Promise<number>((resolve) => {
            node.measureLayout(
              contentHandle,
              (_x, y) => resolve(y),
              () => resolve(Number.POSITIVE_INFINITY),
            );
          }),
      ),
    ).then((ys) => {
      const top = Math.min(...ys);
      if (Number.isFinite(top)) {
        scrollRef.current?.scrollTo({ y: Math.max(top - 24, 0), animated: true });
      }
    });
  }

  function toggleList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function updateSymptom(key: string, value: Frequency) {
    setSymptoms((prev) => ({ ...prev, [key]: value }));
    // Clear this row's error as soon as the user answers it.
    setErrors((prev) => {
      const errKey = `symptom_${key}`;
      if (!prev[errKey]) return prev;
      const next = { ...prev };
      delete next[errKey];
      return next;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    SYMPTOMS.forEach((s) => {
      if (!symptoms[s.key]) e[`symptom_${s.key}`] = "Selecione uma opção";
    });
    if (hasAllergies === null) e.allergies = "Informe se possui alergias";
    if (hasAllergies && !allergiesDetails.trim()) e.allergiesDetails = "Detalhe as alergias";
    if (hasInjury === null) e.injury = "Informe se teve lesão recente";
    if (hasInjury && !injuryDetails.trim()) e.injuryDetails = "Detalhe a lesão";
    if (hasRestriction === null) e.restriction = "Informe se possui restrição";
    if (hasRestriction && !restrictionDetails.trim()) e.restrictionDetails = "Detalhe a restrição";
    if (surgeries.includes("other") && !surgeriesOther.trim()) e.surgeriesOther = "Detalhe a cirurgia";
    if (conditions.includes("other") && !conditionsOther.trim()) e.conditionsOther = "Detalhe a condição";
    setErrors(e);
    const keys = Object.keys(e);
    if (keys.length > 0) scrollToFirstError(keys);
    return keys.length === 0;
  }

  const hasSymptomError = SYMPTOMS.some((s) => errors[`symptom_${s.key}`]);

  function handleNext() {
    if (!validate()) return;
    dispatch({
      type: "SET_MEDICAL_HISTORY",
      payload: {
        lastMedicalExamDate: examDate,
        familyHeartDisease: family,
        surgeries,
        surgeriesOther,
        diagnosedConditions: conditions,
        diagnosedConditionsOther: conditionsOther,
        currentMedications: medications,
        symptoms,
        hasAllergies: hasAllergies ?? false,
        allergiesDetails,
        hasRecentInjury: hasInjury ?? false,
        injuryDetails,
        hasExerciseRestriction: hasRestriction ?? false,
        restrictionDetails,
      },
    });
    navigation.navigate("StepHealthBehavior");
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabel={`Etapa ${currentStep} · Histórico Médico`}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View ref={contentRef} collapsable={false}>
          <Text style={styles.heading}>Histórico médico</Text>
          <Text style={styles.description}>
            Informações de saúde para garantir sua segurança nas atividades.
          </Text>

          <View style={styles.fields}>
            <DateInput
              label="Último exame médico"
              value={examDate}
              onChange={setExamDate}
            />

            <ChipSelect
              label="Doença cardíaca na família"
              options={FAMILY_OPTIONS}
              selected={family}
              onToggle={(v) => setFamily((p) => toggleList(p, v))}
            />

            <ChipSelect
              label="Cirurgias realizadas"
              options={SURGERY_OPTIONS}
              selected={surgeries}
              onToggle={(v) => setSurgeries((p) => toggleList(p, v))}
            />
            {surgeries.includes("other") && (
              <View ref={setFieldRef("surgeriesOther")} collapsable={false}>
                <Input
                  label="Qual cirurgia?"
                  value={surgeriesOther}
                  onChangeText={setSurgeriesOther}
                  error={errors.surgeriesOther}
                />
              </View>
            )}

            <ChipSelect
              label="Condições diagnosticadas"
              options={CONDITION_OPTIONS}
              selected={conditions}
              onToggle={(v) => setConditions((p) => toggleList(p, v))}
            />
            {conditions.includes("other") && (
              <View ref={setFieldRef("conditionsOther")} collapsable={false}>
                <Input
                  label="Qual condição?"
                  value={conditionsOther}
                  onChangeText={setConditionsOther}
                  error={errors.conditionsOther}
                />
              </View>
            )}

            <Input
              label="Medicamentos em uso (opcional)"
              placeholder="Liste os medicamentos"
              value={medications}
              onChangeText={setMedications}
              multiline
            />

            {/* Symptoms */}
            <View style={[styles.symptomsPanel, hasSymptomError && styles.panelError]}>
              <Text style={styles.sectionTitle}>Sintomas</Text>
              {SYMPTOMS.map((s) => (
                <View
                  key={s.key}
                  ref={setFieldRef(`symptom_${s.key}`)}
                  collapsable={false}
                >
                  <SymptomRow
                    label={s.label}
                    value={symptoms[s.key] ?? ""}
                    onChange={(v) => updateSymptom(s.key, v)}
                    error={errors[`symptom_${s.key}`]}
                  />
                </View>
              ))}
            </View>

            <View ref={setFieldRef("allergies")} collapsable={false}>
              <YesNoToggle
                label="Possui alergias?"
                value={hasAllergies}
                onChange={setHasAllergies}
                error={errors.allergies}
              />
            </View>
            {hasAllergies && (
              <View ref={setFieldRef("allergiesDetails")} collapsable={false}>
                <Input
                  label="Quais alergias?"
                  value={allergiesDetails}
                  onChangeText={setAllergiesDetails}
                  error={errors.allergiesDetails}
                />
              </View>
            )}

            <View ref={setFieldRef("injury")} collapsable={false}>
              <YesNoToggle
                label="Lesão recente?"
                value={hasInjury}
                onChange={setHasInjury}
                error={errors.injury}
              />
            </View>
            {hasInjury && (
              <View ref={setFieldRef("injuryDetails")} collapsable={false}>
                <Input
                  label="Descreva a lesão"
                  value={injuryDetails}
                  onChangeText={setInjuryDetails}
                  error={errors.injuryDetails}
                />
              </View>
            )}

            <View ref={setFieldRef("restriction")} collapsable={false}>
              <YesNoToggle
                label="Restrição para exercícios?"
                value={hasRestriction}
                onChange={setHasRestriction}
                error={errors.restriction}
              />
            </View>
            {hasRestriction && (
              <View ref={setFieldRef("restrictionDetails")} collapsable={false}>
                <Input
                  label="Descreva a restrição"
                  value={restrictionDetails}
                  onChangeText={setRestrictionDetails}
                  error={errors.restrictionDetails}
                />
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Button label="Continuar" onPress={handleNext} />
          </View>
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
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    marginLeft: 4,
    marginBottom: spacing.xs,
  },
  symptomsPanel: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  panelError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
    fontFamily: typography.fontBody,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
