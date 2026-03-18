import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SafeScreen } from "../../../components/ui/SafeScreen";
import { WizardHeader } from "../../../components/wizard/WizardHeader";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { DateInput } from "../../../components/ui/DateInput";
import { useWizard } from "../../../context/WizardContext";
import { colors, typography, spacing } from "../../../theme/tokens";
import { formatCPF, validateCPF } from "../../../utils/cpf";

export function Step2PersonalData() {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();

  const [name, setName] = useState(state.name);
  const [birthDate, setBirthDate] = useState(state.birthDate);
  const [taxId, setTaxId] = useState(state.taxId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (name.trim().length < 3) e.name = "Nome deve ter pelo menos 3 caracteres";
    if (birthDate.length < 10) e.birthDate = "Data inválida";
    if (!validateCPF(taxId)) e.taxId = "CPF inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    dispatch({ type: "SET_PERSONAL_DATA", payload: { name, birthDate, taxId } });
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
              placeholder="João da Silva"
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

            <Input
              label="CPF"
              placeholder="000.000.000-00"
              keyboardType="numeric"
              value={taxId}
              onChangeText={(v) => setTaxId(formatCPF(v))}
              error={errors.taxId}
              maxLength={14}
            />
          </View>

          <View style={styles.footer}>
            <Button
              label="Continuar"
              onPress={handleNext}
              disabled={!name || !birthDate || !taxId}
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
