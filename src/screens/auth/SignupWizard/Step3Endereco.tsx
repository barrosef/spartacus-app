import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SafeScreen } from "../../../components/ui/SafeScreen";
import { WizardHeader } from "../../../components/wizard/WizardHeader";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { useWizard, type Role } from "../../../context/WizardContext";
import { colors, typography, spacing } from "../../../theme/tokens";

async function fetchCEP(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

function formatCEP(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function Step3Endereco() {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();

  const [postalCode, setPostalCode] = useState(state.postalCode);
  const [street, setStreet] = useState(state.street);
  const [number, setNumber] = useState(state.number);
  const [complement, setComplement] = useState(state.complement);
  const [neighborhood, setNeighborhood] = useState(state.neighborhood);
  const [city, setCity] = useState(state.city);
  const [addressState, setAddressState] = useState(state.state);
  const [loadingCep, setLoadingCep] = useState(false);

  async function handleCEPBlur() {
    const digits = postalCode.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    const data = await fetchCEP(digits);
    setLoadingCep(false);
    if (data) {
      setStreet(data.logradouro ?? "");
      setNeighborhood(data.bairro ?? "");
      setCity(data.localidade ?? "");
      setAddressState(data.uf ?? "");
    }
  }

  function handleNext() {
    dispatch({
      type: "SET_ADDRESS",
      payload: { postalCode, street, number, complement, neighborhood, city, state: addressState },
    });
    const roles: Role[] = state.roles;
    const isGuardian = roles.includes("guardian");
    const hasClassRole = roles.some((r) =>
      ["student", "teacher", "instructor"].includes(r as string)
    );
    const onlySupport =
      roles.length > 0 &&
      roles.every((r) => ["supporter", "sponsor"].includes(r as string));

    if (isGuardian) {
      navigation.navigate("Step5DepDados");
    } else if (hasClassRole) {
      navigation.navigate("Step5TurmasProprias");
    } else if (onlySupport) {
      navigation.navigate("Step6Revisao");
    } else {
      navigation.navigate("Step6Revisao");
    }
  }

  const canContinue = postalCode.replace(/\D/g, "").length === 8 && street && city;

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={4}
        totalSteps={6}
        stepLabel="Etapa 4 · Endereço"
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
          <Text style={styles.heading}>Endereço</Text>
          <Text style={styles.description}>
            Informe seu endereço. Digite o CEP para preenchimento automático.
          </Text>

          <View style={styles.fields}>
            <Input
              label="CEP"
              placeholder="78350-000"
              keyboardType="numeric"
              value={postalCode}
              onChangeText={(v) => setPostalCode(formatCEP(v))}
              onBlur={handleCEPBlur}
              maxLength={9}
              rightIcon={loadingCep ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
            />

            <Input
              label="Logradouro"
              placeholder="Rua das Flores"
              autoCapitalize="words"
              value={street}
              onChangeText={setStreet}
            />

            <View style={styles.row}>
              <View style={styles.rowSmall}>
                <Input
                  label="Número"
                  placeholder="123"
                  keyboardType="numeric"
                  value={number}
                  onChangeText={setNumber}
                />
              </View>
              <View style={styles.rowLarge}>
                <Input
                  label="Complemento"
                  placeholder="Apto 2"
                  value={complement}
                  onChangeText={setComplement}
                />
              </View>
            </View>

            <Input
              label="Bairro"
              placeholder="Centro"
              autoCapitalize="words"
              value={neighborhood}
              onChangeText={setNeighborhood}
            />

            <View style={styles.row}>
              <View style={styles.rowLarge}>
                <Input
                  label="Cidade"
                  placeholder="Brasnorte"
                  autoCapitalize="words"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.rowSmall}>
                <Input
                  label="UF"
                  placeholder="MT"
                  autoCapitalize="characters"
                  value={addressState}
                  onChangeText={setAddressState}
                  maxLength={2}
                />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Continuar"
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
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  fields: {
    gap: spacing.md + 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowSmall: {
    flex: 2,
  },
  rowLarge: {
    flex: 3,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
