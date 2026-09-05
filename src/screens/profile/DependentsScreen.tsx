import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useDialog } from "../../components/ui/DialogProvider";

interface DependentData {
  uid: string;
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  approvalStatus: string;
  registrationComplete: boolean;
}

type SubScreen = "list" | "add-step1" | "add-step2" | "success";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function calcAge(bd: string): number | null {
  try {
    const [d, m, y] = bd.split("/").map(Number);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) age--;
    return age;
  } catch { return null; }
}

interface DependentsScreenProps {
  onBack: () => void;
}

export function DependentsScreen({ onBack }: DependentsScreenProps) {
  const { switchTo } = useProxy();
  const dialog = useDialog();
  const [deps, setDeps] = useState<DependentData[]>([]);
  const [sub, setSub] = useState<SubScreen>("list");

  // Add form state
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [saving, setSaving] = useState(false);
  const [createdDep, setCreatedDep] = useState<DependentData | null>(null);

  const fetchDeps = useCallback(async () => {
    try {
      const data = await api.get<DependentData[]>("/users/me/dependents");
      setDeps(data);
    } catch { /* graceful */ }
  }, []);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  const handleCreate = async () => {
    if (!name || name.trim().length < 3) {
      dialog.alert({ message: "Nome deve ter ao menos 3 caracteres" });
      return;
    }
    if (!birthDate) {
      dialog.alert({ message: "Informe a data de nascimento" });
      return;
    }
    if (!gender) {
      dialog.alert({ message: "Selecione o sexo" });
      return;
    }

    setSaving(true);
    try {
      const dep = await api.post<DependentData>("/users/me/dependents", {
        name: name.trim(),
        birthDate,
        gender,
      });
      setCreatedDep(dep);
      setSub("success");
      fetchDeps();
    } catch (err: unknown) {
      dialog.alert({ title: "Erro", message: err instanceof Error ? err.message : "Erro ao criar", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName(""); setBirthDate(""); setGender("");
    setCreatedDep(null);
  };

  // ── Step 1: Basic data ──
  if (sub === "add-step1") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Feather name="chevron-left" size={24} color={colors.foreground}
            onPress={() => { resetForm(); setSub("list"); }} />
          <Text style={styles.headerTitle}>Novo dependente</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.content}>
          <Input label="Nome completo" value={name} onChangeText={setName}
            autoCapitalize="words" autoComplete="name" />
          <Input label="Data de nascimento" value={birthDate}
            onChangeText={setBirthDate} placeholder="DD/MM/AAAA"
            keyboardType="numeric" maxLength={10} />
          <View style={styles.genderRow}>
            <Text style={styles.genderLabel}>Sexo</Text>
            <View style={styles.genderBtns}>
              {(["male", "female"] as const).map((g) => (
                <Button key={g} variant={gender === g ? "primary" : "outline"}
                  label={g === "male" ? "Masculino" : "Feminino"}
                  onPress={() => setGender(g)} style={styles.genderBtn} />
              ))}
            </View>
          </View>
          <Button label="Continuar" onPress={() => setSub("add-step2")}
            disabled={!name || !birthDate || !gender} style={styles.btn} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 2: Confirm ──
  if (sub === "add-step2") {
    const age = birthDate ? calcAge(birthDate) : null;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Feather name="chevron-left" size={24} color={colors.foreground}
            onPress={() => setSub("add-step1")} />
          <Text style={styles.headerTitle}>Confirmar</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.content}>
          <View style={styles.confirmCard}>
            <Row label="Nome" value={name} />
            <Row label="Nascimento" value={birthDate} />
            {age != null && <Row label="Idade" value={`${age} anos`} />}
            <Row label="Sexo" value={gender === "male" ? "Masculino" : "Feminino"} />
          </View>
          <Text style={styles.hint}>
            Após criar, você poderá completar o cadastro (turmas, modalidades e
            demais dados) acessando o perfil do dependente pelo botão no topo da tela.
          </Text>
          <Button label="Criar dependente" loading={saving}
            onPress={handleCreate} style={styles.btn} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Success ──
  if (sub === "success" && createdDep) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={40} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>
            {createdDep.name.split(" ")[0]} foi adicionado!
          </Text>
          <Text style={styles.hint}>
            Para completar o cadastro, selecione turmas e modalidades.
          </Text>
          <Button label="Continuar cadastro" style={styles.btn}
            onPress={() => {
              switchTo(createdDep.uid, createdDep.name);
              resetForm();
              onBack();
            }} />
          <Button label="Fazer depois" variant="ghost" style={styles.ghostBtn}
            onPress={() => { resetForm(); setSub("list"); }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── List ──
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Feather name="chevron-left" size={24} color={colors.foreground}
          onPress={onBack} />
        <Text style={styles.headerTitle}>Dependentes</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {deps.map((dep) => {
          const age = dep.birthDate ? calcAge(dep.birthDate) : null;
          return (
            <View key={dep.uid} style={styles.depCard}>
              <View style={styles.depAvatar}>
                <Text style={styles.depAvatarText}>{getInitials(dep.name)}</Text>
              </View>
              <View style={styles.depInfo}>
                <Text style={styles.depName}>
                  {dep.name}
                  {age != null && <Text style={styles.depAge}>{`  · ${age} anos`}</Text>}
                </Text>
                <Text style={[
                  styles.depStatus,
                  !dep.registrationComplete && styles.depStatusWarn,
                ]}>
                  {dep.registrationComplete ? "Cadastro completo" : "Cadastro incompleto"}
                </Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addCard}
          activeOpacity={0.7} onPress={() => setSub("add-step1")}>
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={styles.addText}>Adicionar dependente</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1, textAlign: "center", color: colors.foreground,
    fontFamily: typography.fontHeadingSemi, fontSize: 17,
  },
  spacer: { width: 24 },
  content: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: spacing.md },
  scroll: { padding: spacing.md, gap: spacing.sm },
  btn: { marginTop: spacing.lg },
  ghostBtn: { marginTop: spacing.sm },

  // Dep list
  depCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm + 4,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  depAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(198,163,78,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  depAvatarText: { color: colors.primary, fontFamily: typography.fontHeadingSemi, fontSize: 14 },
  depInfo: { flex: 1 },
  depName: { color: colors.foreground, fontFamily: typography.fontBodySemiBold, fontSize: 14 },
  depAge: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 13 },
  depStatus: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 12, marginTop: 2 },
  depStatusWarn: { color: colors.warning },
  addCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    padding: spacing.md,
  },
  addText: { color: colors.primary, fontFamily: typography.fontBodySemiBold, fontSize: 14 },

  // Confirm
  confirmCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 14 },
  rowValue: { color: colors.foreground, fontFamily: typography.fontBodySemiBold, fontSize: 14 },
  hint: {
    color: colors.mutedForeground, fontFamily: typography.fontBody,
    fontSize: 13, lineHeight: 20,
  },

  // Success
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  successIcon: { marginBottom: spacing.md },
  successTitle: {
    color: colors.foreground, fontFamily: typography.fontHeadingSemi,
    fontSize: 20, marginBottom: spacing.sm, textAlign: "center",
  },

  // Gender
  genderRow: { gap: spacing.xs },
  genderLabel: { fontSize: 14, fontFamily: typography.fontBodyMedium, color: colors.mutedForeground, marginLeft: 4 },
  genderBtns: { flexDirection: "row", gap: spacing.sm },
  genderBtn: { flex: 1, height: 48 },
});
