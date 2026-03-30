import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";
import { api } from "../../lib/api";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface ProfileData {
  name: string;
  email?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  taxId?: string | null;
}

interface PersonalDataScreenProps {
  onBack: () => void;
}

export function PersonalDataScreen({ onBack }: PersonalDataScreenProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [taxId, setTaxId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<ProfileData>("/users/me/profile");
      setData(res);
      setName(res.name ?? "");
      setBirthDate(res.birthDate ?? "");
      setGender(res.gender ?? "");
      setPhone(res.phone ?? "");
      setWhatsapp(res.whatsapp ?? "");
      setTaxId(res.taxId ?? "");
    } catch {
      // graceful
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name || name.trim().length < 3) {
      errs.name = "Nome deve ter ao menos 3 caracteres";
    }
    if (!birthDate) {
      errs.birthDate = "Data de nascimento é obrigatória";
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length < 10) {
      errs.phone = "Telefone deve ter 10 ou 11 dígitos";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch("/users/me/profile", {
        name: name.trim(),
        birthDate,
        gender: gender || undefined,
        phone: phone.replace(/\D/g, "") || undefined,
        whatsapp: whatsapp.replace(/\D/g, "") || undefined,
        taxId: taxId.replace(/\D/g, "") || undefined,
      });
      Alert.alert("Dados atualizados");
      onBack();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar";
      Alert.alert("Erro", msg);
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.safe} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={24}
          color={colors.foreground}
          onPress={onBack}
        />
        <Text style={styles.headerTitle}>Dados pessoais</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Input
          label="Nome completo"
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
          autoComplete="name"
        />

        <Input
          label="Data de nascimento"
          value={birthDate}
          onChangeText={setBirthDate}
          error={errors.birthDate}
          placeholder="DD/MM/AAAA"
          keyboardType="numeric"
          maxLength={10}
        />

        <View style={styles.genderRow}>
          <Text style={styles.genderLabel}>Sexo</Text>
          <View style={styles.genderBtns}>
            {(["male", "female"] as const).map((g) => (
              <Button
                key={g}
                variant={gender === g ? "primary" : "outline"}
                label={g === "male" ? "Masculino" : "Feminino"}
                onPress={() => setGender(g)}
                style={styles.genderBtn}
              />
            ))}
          </View>
        </View>

        <Input
          label="Telefone"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={15}
        />

        <Input
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
          maxLength={15}
          hint="Opcional"
        />

        <Input
          label="CPF"
          value={taxId}
          onChangeText={setTaxId}
          placeholder="000.000.000-00"
          keyboardType="numeric"
          maxLength={14}
          hint="Opcional"
        />

        {data.email && (
          <Input
            label="E-mail"
            value={data.email}
            editable={false}
            hint="Vinculado à sua conta Google"
            rightIcon={
              <Feather
                name="lock"
                size={16}
                color={colors.mutedForeground}
              />
            }
          />
        )}

        <Button
          label="Salvar alterações"
          loading={saving}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  genderRow: {
    gap: spacing.xs,
  },
  genderLabel: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    marginLeft: 4,
  },
  genderBtns: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  genderBtn: {
    flex: 1,
    height: 48,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
});
