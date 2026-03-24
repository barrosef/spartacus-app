import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SafeScreen } from "../../../components/ui/SafeScreen";
import { WizardHeader } from "../../../components/wizard/WizardHeader";
import { Button } from "../../../components/ui/Button";
import { ErrorModal } from "../../../components/ui/ErrorModal";
import { useWizard } from "../../../context/WizardContext";
import { api, ApiError } from "../../../lib/api";
import { useSignupGuard } from "../../../navigation/RootNavigator";
import { colors, typography, spacing, radius } from "../../../theme/tokens";

interface SignupResponse {
  uid: string;
  status: string;
}

export function Step6Review() {
  const navigation = useAuthNavigation();
  const { state } = useWizard();
  const { setSignupInProgress } = useSignupGuard();
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const roleLabels: Record<string, string> = {
    student: "Aluno",
    guardian: "Responsável",
    teacher: "Professor",
    instructor: "Instrutor",
    supporter: "Apoiador",
    sponsor: "Patrocinador",
  };

  async function handleSubmit() {
    setLoading(true);
    try {
      const payload = {
        authMethod: state.authMethod,
        email: state.email,
        password: state.authMethod === "email" ? state.password : undefined,
        name: state.name,
        birthDate: state.birthDate,
        taxId: state.taxId || undefined,
        phone: state.phone,
        whatsapp: state.whatsapp,
        postalCode: state.postalCode,
        street: state.street,
        number: state.number,
        complement: state.complement || undefined,
        neighborhood: state.neighborhood,
        city: state.city,
        state: state.state,
        roles: state.roles,
        dependents: state.dependents.map((dep) => ({
          id: dep.id,
          name: dep.name,
          birthDate: dep.birthDate,
          taxId: dep.taxId || undefined,
          classIds: dep.classIds,
        })),
        classIds: state.classIds,
      };

      await api.post<SignupResponse>("/auth/signup", payload);
      if (state.authMethod === "email") {
        navigation.navigate("EmailSent", { email: state.email });
      }
      setSignupInProgress(false);
    } catch (error: unknown) {
      let title = "Erro ao criar conta";
      let msg = "Ocorreu um erro inesperado. Tente novamente em alguns instantes.";
      if (error instanceof ApiError) {
        if (error.status === 409) {
          title = "Conta já existente";
          msg = "Já existe uma conta com esses dados. Se você já tem uma conta, faça login.";
        } else if (error.status === 422) {
          title = "Dados inválidos";
          msg = error.message;
        } else if (error.status >= 500) {
          msg = "O servidor encontrou um problema. Tente novamente em alguns instantes.";
        } else {
          msg = error.message;
        }
      } else if (error instanceof Error) {
        msg = error.message;
      }
      setErrorModal({ title, message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={6}
        totalSteps={6}
        stepLabel="Etapa 6 · Revisão"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Revisar dados</Text>
        <Text style={styles.description}>
          Confira suas informações antes de enviar para aprovação.
        </Text>

        <Section title="Dados Pessoais">
          <Row label="Nome" value={state.name} />
          <Row label="Data de nasc." value={state.birthDate} />
        </Section>

        <Section title="Contato">
          <Row label="Celular" value={state.phone} />
          <Row label="WhatsApp" value={state.whatsapp} />
        </Section>

        <Section title="Endereço">
          <Row
            label="Endereço"
            value={[state.street, state.number, state.complement]
              .filter(Boolean)
              .join(", ")}
          />
          <Row label="Bairro" value={state.neighborhood} />
          <Row
            label="Cidade/UF"
            value={`${state.city}/${state.state}`}
          />
          <Row label="CEP" value={state.postalCode} />
        </Section>

        <Section title="Perfis">
          <View style={styles.chips}>
            {state.roles.map((r) => (
              <View key={r} style={styles.chip}>
                <Text style={styles.chipText}>{roleLabels[r] ?? r}</Text>
              </View>
            ))}
          </View>
        </Section>

        {state.dependents.length > 0 && (
          <Section title="Dependentes">
            {state.dependents.map((dep) => (
              <View key={dep.id} style={styles.depRow}>
                <Text style={styles.depRowName}>{dep.name}</Text>
                <Text style={styles.depRowSub}>
                  {dep.birthDate} · {dep.classIds.length} turma(s)
                </Text>
              </View>
            ))}
          </Section>
        )}

        {state.classIds.length > 0 && (
          <Section title="Turmas selecionadas">
            <Row
              label="Total"
              value={`${state.classIds.length} turma(s)`}
            />
          </Section>
        )}

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Sua conta será revisada pela equipe antes da ativação. Você receberá
            uma notificação assim que aprovada.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            label="Enviar para aprovação"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </ScrollView>

      <ErrorModal
        visible={!!errorModal}
        title={errorModal?.title}
        message={errorModal?.message ?? ""}
        onClose={() => setErrorModal(null)}
      />
    </SafeScreen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value || "—"}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 11,
    fontFamily: typography.fontBodySemiBold,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.foreground,
    flex: 2,
    textAlign: "right",
  },
});

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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    padding: spacing.md,
  },
  chip: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
  },
  depRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  depRowName: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.foreground,
  },
  depRowSub: {
    fontSize: 12,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
  },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: "rgba(198,163,78,0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.2)",
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.md,
  },
});
