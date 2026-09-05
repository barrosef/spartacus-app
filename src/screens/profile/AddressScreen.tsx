import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SuccessScreen } from "../../components/ui/SuccessScreen";
import { useDialog } from "../../components/ui/DialogProvider";

interface AddressData {
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ProfileData {
  address?: AddressData | null;
  isDependent: boolean;
}

interface AddressScreenProps {
  onBack: () => void;
}

export function AddressScreen({ onBack }: AddressScreenProps) {
  const { actingAs } = useProxy();  // needed to check read-only mode
  const dialog = useDialog();
  const [isDependent, setIsDependent] = useState(false);
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchAddress = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<ProfileData>(
        "/users/me/profile",
        { headers },
      );
      setIsDependent(data.isDependent);
      const addr = data.address;
      if (addr) {
        setCep(addr.postalCode ?? "");
        setStreet(addr.street ?? "");
        setNumber(addr.number ?? "");
        setComplement(addr.complement ?? "");
        setNeighborhood(addr.neighborhood ?? "");
        setCity(addr.city ?? "");
        setState(addr.state ?? "");
      }
    } catch {
      // graceful
    }
  }, [actingAs]);

  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  const handleCepBlur = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setLoading(true);
    try {
      const res = await fetch(
        `https://viacep.com.br/ws/${digits}/json/`,
      );
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro ?? "");
        setNeighborhood(data.bairro ?? "");
        setCity(data.localidade ?? "");
        setState(data.uf ?? "");
      }
    } catch {
      // silent — user can fill manually
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cep || !street || !number || !neighborhood || !city || !state) {
      dialog.alert({ message: "Preencha todos os campos obrigatórios" });
      return;
    }

    setSaving(true);
    try {
      await api.patch("/users/me/address", {
        postalCode: cep.replace(/\D/g, ""),
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state: state.toUpperCase(),
      });
      setShowSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar";
      dialog.alert({ title: "Erro", message: msg, tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  if (showSuccess) {
    return (
      <SuccessScreen
        title="Endereço atualizado!"
        onDismiss={onBack}
      />
    );
  }

  const readOnly = isDependent && !!actingAs;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={24}
          color={colors.foreground}
          onPress={onBack}
        />
        <Text style={styles.headerTitle}>Endereço</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        {readOnly && (
          <Text style={styles.readOnlyHint}>
            O endereço do dependente é o mesmo do responsável.
          </Text>
        )}

        <Input
          label="CEP"
          value={cep}
          onChangeText={setCep}
          onBlur={handleCepBlur}
          placeholder="00000-000"
          keyboardType="numeric"
          maxLength={9}
          editable={!readOnly}
          rightIcon={
            loading ? (
              <Text style={styles.loadingDot}>...</Text>
            ) : undefined
          }
        />

        <Input
          label="Logradouro"
          value={street}
          onChangeText={setStreet}
          editable={!readOnly}
        />

        <View style={styles.row}>
          <Input
            label="Número"
            value={number}
            onChangeText={setNumber}
            containerStyle={styles.flex1}
            editable={!readOnly}
          />
          <Input
            label="Complemento"
            value={complement}
            onChangeText={setComplement}
            containerStyle={styles.flex1}
            hint="Opcional"
            editable={!readOnly}
          />
        </View>

        <Input
          label="Bairro"
          value={neighborhood}
          onChangeText={setNeighborhood}
          editable={!readOnly}
        />

        <View style={styles.row}>
          <Input
            label="Cidade"
            value={city}
            containerStyle={styles.flex2}
            editable={false}
          />
          <Input
            label="UF"
            value={state}
            containerStyle={styles.flex05}
            editable={false}
          />
        </View>

        {!readOnly && (
          <Button
            label="Salvar endereço"
            loading={saving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 17,
  },
  headerSpacer: {
    width: 24,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  readOnlyHint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    backgroundColor: "rgba(198,163,78,0.08)",
    padding: spacing.sm + 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  flex05: {
    flex: 0.5,
  },
  loadingDot: {
    color: colors.primary,
    fontSize: 16,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
});
