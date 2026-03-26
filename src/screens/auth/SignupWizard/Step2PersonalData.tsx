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

export function Step2PersonalData() {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();

  const [name, setName] = useState(state.name);
  const [birthDate, setBirthDate] = useState(state.birthDate);
  const [gender, setGender] = useState<"male" | "female" | "">(state.gender);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (name.trim().length < 3) e.name = "Nome deve ter pelo menos 3 caracteres";
    if (birthDate.length < 10) e.birthDate = "Data inválida";
    if (!gender) e.gender = "Selecione o gênero";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    dispatch({ type: "SET_PERSONAL_DATA", payload: { name, birthDate, gender: gender as "male" | "female" } });
    navigation.navigate("Step3Contact");
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={2}
        totalSteps={6}
        stepLabel="Etapa 2 · Dados Pessoais"
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
          <Text style={styles.heading}>Seus dados</Text>
          <Text style={styles.description}>
            Precisamos de algumas informações para criar seu perfil.
          </Text>

          <View style={styles.fields}>
            <Input
              label="Nome completo"
              placeholder="Informe seu nome completo"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              error={errors.name}
              onBlur={() => {
                if (name.trim().length > 0 && name.trim().length < 3) {
                  setErrors((e) => ({ ...e, name: "Nome deve ter pelo menos 3 caracteres" }));
                } else {
                  setErrors((e) => { const n = { ...e }; delete n.name; return n; });
                }
              }}
            />

            <DateInput
              label="Data de nascimento"
              value={birthDate}
              onChange={setBirthDate}
              error={errors.birthDate}
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
              {errors.gender && <Text style={styles.genderError}>{errors.gender}</Text>}
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Continuar"
              onPress={handleNext}
              disabled={!name || !birthDate || !gender}
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
  genderError: {
    fontSize: 12,
    fontFamily: typography.fontBody,
    color: colors.error,
    marginTop: 4,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
