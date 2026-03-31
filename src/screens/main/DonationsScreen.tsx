import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SuccessScreen } from "../../components/ui/SuccessScreen";

interface DonationConfigItem {
  code: string;
  label: string;
  active: boolean;
}

interface DonationConfig {
  items: DonationConfigItem[];
  thankYouMessage: string;
}

interface CurrentDonation {
  id: string;
  item: string;
  itemLabel: string;
  month: string;
  status: string;
}

type Screen = "loading" | "select" | "confirm" | "success" | "already";

interface DonationsScreenProps {
  onDone: () => void;
}

export function DonationsScreen({ onDone }: DonationsScreenProps) {
  const { actingAs } = useProxy();
  const [screen, setScreen] = useState<Screen>("loading");
  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [existing, setExisting] = useState<CurrentDonation | null>(null);
  const [selectedItem, setSelectedItem] = useState("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
    ?? "spartacus-artes-marciais";

  const fetchData = useCallback(async () => {
    setScreen("loading");
    try {
      const [cfg, cur] = await Promise.allSettled([
        api.get<DonationConfig>(
          `/projects/${projectId}/donation-config`,
        ),
        api.get<CurrentDonation>("/donations/current"),
      ]);

      if (cfg.status === "fulfilled") setConfig(cfg.value);
      if (cur.status === "fulfilled") {
        setExisting(cur.value);
        setScreen("already");
        return;
      }
      setScreen("select");
    } catch {
      setScreen("select");
    }
  }, [projectId, actingAs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/donations", {
        item: selectedItem,
        itemDescription: selectedItem === "other"
          ? otherText : undefined,
      });
      setScreen("success");
    } catch {
      // handled by API error
    } finally {
      setSubmitting(false);
    }
  };

  const items = config?.items.filter((i) => i.active) ?? [];
  const selectedLabel = items.find(
    (i) => i.code === selectedItem,
  )?.label ?? selectedItem;

  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", {
    month: "long", year: "numeric",
  });

  // ── Success ──
  if (screen === "success") {
    return (
      <SuccessScreen
        title="Doação Registrada!"
        message={
          config?.thankYouMessage
          || "Muito obrigado pelo seu apoio!"
        }
        onDismiss={onDone}
      />
    );
  }

  // ── Already donated this month ──
  if (screen === "already" && existing) {
    return (
      <SuccessScreen
        variant="warning"
        title="Doação já registrada"
        message={`${existing.itemLabel} — ${monthLabel}`}
      />
    );
  }

  // ── Loading ──
  if (screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Confirm ──
  if (screen === "confirm") {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading}>Confirmação</Text>
          <Text style={styles.sub}>
            Confirme os detalhes da sua doação. Você deverá
            entregar o item no próximo treino.
          </Text>

          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>
              Item selecionado
            </Text>
            <Text style={styles.confirmValue}>
              {selectedLabel}
            </Text>
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
                {monthLabel}
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
            label="Confirmar Doação"
            loading={submitting}
            onPress={handleSubmit}
          />
          <Button
            label="Voltar e alterar"
            variant="ghost"
            onPress={() => setScreen("select")}
            style={styles.ghostBtn}
          />
        </View>
      </View>
    );
  }

  // ── Select item ──
  const canContinue = selectedItem !== ""
    && (selectedItem !== "other" || otherText.trim().length > 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Apoie o Projeto</Text>
        <Text style={styles.sub}>
          Sua contribuição mensal ajuda a manter o projeto
          Spartacus Artes Marciais de Brasnorte vivo.
          Escolha sua doação deste mês:
        </Text>

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
          onPress={() => setScreen("confirm")}
        />
      </View>
    </View>
  );
}

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

  // Item list
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

  // Confirm
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
  confirmValue: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
    marginBottom: spacing.sm,
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
