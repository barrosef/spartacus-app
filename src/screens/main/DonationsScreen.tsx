import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { useDialog } from "../../components/ui/DialogProvider";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SuccessScreen } from "../../components/ui/SuccessScreen";

/* ── Types ─────────────────────────────────────────────────────── */

interface SupportConfigItem {
  code: string;
  label: string;
  active: boolean;
}

interface SupportConfig {
  donations: SupportConfigItem[];
  services: SupportConfigItem[];
  thankYouMessage: string;
}

type SupportType = "donation" | "service";

type Screen =
  | "loading"
  | "error"
  | "type"
  | "select"
  | "month"
  | "confirm"
  | "success";

/* ── Month helpers ─────────────────────────────────────────────── */

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyToLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]}/${y}`;
}

/* ── Component ─────────────────────────────────────────────────── */

interface DonationsScreenProps {
  onDone: () => void;
}

export function DonationsScreen({ onDone }: DonationsScreenProps) {
  const { actingAs } = useProxy();
  const dialog = useDialog();
  const [screen, setScreen] = useState<Screen>("loading");
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [supportType, setSupportType] = useState<SupportType>("donation");
  const [selectedItem, setSelectedItem] = useState("");
  const [otherText, setOtherText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [submitting, setSubmitting] = useState(false);

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
    ?? "spartacus-artes-marciais";

  const fetchData = useCallback(async () => {
    setScreen("loading");
    try {
      const cfg = await api.get<SupportConfig>(
        `/projects/${projectId}/support-config`,
      );
      setConfig(cfg);
      setScreen("type");
    } catch {
      // Surface the failure instead of dead-ending the wizard with an
      // empty config (no items → continue stuck on the select step).
      setScreen("error");
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      await api.post(
        "/support",
        {
          supportType,
          item: selectedItem,
          itemDescription: selectedItem === "other" ? otherText : undefined,
          month: selectedMonth,
        },
        { headers },
      );
      setScreen("success");
    } catch (err: unknown) {
      // Surface the real failure — never leave the user on the confirmation
      // step with no feedback (previously an empty catch swallowed it).
      dialog.alert({
        title: "Erro",
        message: err instanceof Error
          ? err.message
          : "Não foi possível registrar seu apoio. Tente novamente.",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const items = (
    config ? (supportType === "donation" ? config.donations : config.services) : []
  ).filter((i) => i.active);
  const selectedLabel = items.find(
    (i) => i.code === selectedItem,
  )?.label ?? selectedItem;

  const now = new Date();

  /* ── Success ── */
  if (screen === "success") {
    return (
      <SuccessScreen
        title="Apoio registrado!"
        message={
          config?.thankYouMessage
          || "Muito obrigado pelo seu apoio!"
        }
        onDismiss={onDone}
      />
    );
  }

  /* ── Loading ── */
  if (screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  /* ── Error (config failed to load) ── */
  if (screen === "error") {
    return (
      <View style={styles.container}>
        <WizardHeader />
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.heading, styles.errorTitle]}>
            Não foi possível carregar
          </Text>
          <Text style={[styles.sub, styles.errorSub]}>
            Verifique sua conexão e tente novamente.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button label="Tentar novamente" onPress={fetchData} />
        </View>
      </View>
    );
  }

  /* ── Step 3: Confirm ── */
  if (screen === "confirm") {
    return (
      <View style={styles.container}>
        <WizardHeader onBack={() => setScreen("month")} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading}>Confirmação</Text>
          <Text style={styles.sub}>
            Confirme os detalhes do seu apoio. Você deverá
            entregar o item no próximo treino.
          </Text>

          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>
              Item selecionado
            </Text>
            <View style={styles.confirmItemRow}>
              <Text style={styles.confirmValue}>
                {selectedLabel}
              </Text>
              <Feather name="gift" size={32} color="rgba(198,163,78,0.4)" />
            </View>
            {selectedItem === "other" && otherText && (
              <Text style={styles.confirmOther}>
                {otherText}
              </Text>
            )}
            <View style={styles.confirmRow}>
              <Text style={styles.confirmMeta}>
                Mês de Referência
              </Text>
              <Text style={styles.confirmMetaValue}>
                {monthKeyToLabel(selectedMonth)}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmMeta}>Destino</Text>
              <Text style={styles.confirmMetaValue}>
                Projeto Spartacus
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Confirmar apoio"
            loading={submitting}
            onPress={handleSubmit}
          />
          <Button
            label="Voltar e alterar"
            variant="ghost"
            onPress={() => setScreen("type")}
            style={styles.ghostBtn}
          />
        </View>
      </View>
    );
  }

  /* ── Step 2: Month selector ── */
  if (screen === "month") {
    const currentYear = now.getFullYear();
    return (
      <View style={styles.container}>
        <WizardHeader onBack={() => setScreen("select")} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading}>Mês de Referência</Text>
          <Text style={styles.sub}>
            A qual mês esse apoio se refere? Você pode registrar
            apoios de meses passados se esqueceu.
          </Text>

          <View style={styles.monthGrid}>
            {MONTH_NAMES.map((name, idx) => {
              const key = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
              const active = selectedMonth === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.monthPill, active && styles.monthPillActive]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMonth(key)}
                >
                  <Text
                    style={[
                      styles.monthPillText,
                      active && styles.monthPillTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Revisar Apoio →"
            onPress={() => setScreen("confirm")}
          />
        </View>
      </View>
    );
  }

  /* ── Step 0: Type (donation | service) ── */
  if (screen === "type") {
    return (
      <View style={styles.container}>
        <WizardHeader />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading}>Apoie o Projeto</Text>
          <Text style={styles.sub}>
            Você pode apoiar o Spartacus de duas formas. O que você
            gostaria de oferecer?
          </Text>

          <View style={styles.itemList}>
            {([
              { t: "donation" as SupportType, label: "Doação", hint: "Itens (alimentos, materiais...)" },
              { t: "service" as SupportType, label: "Serviço", hint: "Prestar um serviço ao projeto" },
            ]).map(({ t, label, hint }) => {
              const active = supportType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.itemCard, active && styles.itemCardActive]}
                  activeOpacity={0.7}
                  onPress={() => { setSupportType(t); setSelectedItem(""); }}
                >
                  <View style={styles.radio}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                      {label}
                    </Text>
                    <Text style={styles.sub}>{hint}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Continuar →" onPress={() => setScreen("select")} />
        </View>
      </View>
    );
  }

  /* ── Step 1: Select item ── */
  const canContinue = selectedItem !== ""
    && (selectedItem !== "other" || otherText.trim().length > 0);

  return (
    <View style={styles.container}>
      <WizardHeader onBack={() => setScreen("type")} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>
          {supportType === "donation" ? "Escolha a doação" : "Escolha o serviço"}
        </Text>
        <Text style={styles.sub}>
          {supportType === "donation"
            ? "O que você gostaria de doar?"
            : "Qual serviço você gostaria de oferecer?"}
        </Text>

        {items.length === 0 ? (
          <Text style={styles.sub}>
            {supportType === "donation"
              ? "Nenhuma opção de doação configurada no momento."
              : "Nenhuma opção de serviço configurada no momento."}
          </Text>
        ) : (
          <View style={styles.itemList}>
            {items.map((item) => {
              const active = selectedItem === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.itemCard, active && styles.itemCardActive]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedItem(item.code)}
                >
                  <View style={styles.radio}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[
                    styles.itemLabel,
                    active && styles.itemLabelActive,
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedItem === "other" && (
          <Input
            label="Descreva sua contribuição"
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Ex: Materiais esportivos"
            containerStyle={styles.otherInput}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continuar →"
          disabled={!canContinue}
          onPress={() => setScreen("month")}
        />
      </View>
    </View>
  );
}

/* ── Wizard Header ─────────────────────────────────────────────── */

function WizardHeader({ onBack }: { onBack?: () => void } = {}) {
  return (
    <View style={styles.wizardHeader}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
      ) : (
        <View style={styles.wizardHeaderSpacer} />
      )}
      <View style={styles.wizardTitleRow}>
        <Feather name="heart" size={18} color={colors.primary} />
        <Text style={styles.wizardTitle}>Apoio ao Projeto</Text>
      </View>
      <View style={styles.wizardHeaderSpacer} />
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  sub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  ghostBtn: {
    marginTop: spacing.sm,
  },
  errorTitle: {
    marginTop: spacing.md,
    textAlign: "center",
  },
  errorSub: {
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },

  // Wizard header
  wizardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wizardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  wizardTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  wizardHeaderSpacer: {
    width: 24,
  },

  // Item list (step 1)
  itemList: {
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.06)",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  itemLabel: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 15,
    flex: 1,
  },
  itemLabelActive: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },
  otherInput: {
    marginTop: spacing.md,
  },

  // Month grid (step 2)
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm + 4,
  },
  monthPill: {
    width: "30%",
    alignItems: "center",
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthPillActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  monthPillText: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 14,
  },
  monthPillTextActive: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },

  // Confirm (step 3)
  confirmCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmLabel: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  confirmItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmValue: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
    flex: 1,
  },
  confirmOther: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmMeta: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  confirmMetaValue: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
});
