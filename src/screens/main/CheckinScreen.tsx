import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Button } from "../../components/ui/Button";
import { SuccessScreen } from "../../components/ui/SuccessScreen";

interface AvailableCheckin {
  aulaId: string;
  turmaId: string;
  turmaName: string;
  modalityName: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  teacher?: string | null;
  location?: string | null;
  alreadyCheckedIn: boolean;
}

interface NoCheckin {
  message: string;
  nextClass?: {
    turmaName: string;
    modalityName: string;
    dayOfWeek: string;
    startTime: string;
  } | null;
}

type Screen = "loading" | "available" | "none" | "success" | "already";

interface CheckinScreenProps {
  onDone: () => void;
}

export function CheckinScreen({ onDone }: CheckinScreenProps) {
  const { actingAs } = useProxy();
  const [screen, setScreen] = useState<Screen>("loading");
  const [checkin, setCheckin] = useState<AvailableCheckin | null>(null);
  const [noCheckin, setNoCheckin] = useState<NoCheckin | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchAvailable = useCallback(async () => {
    setScreen("loading");
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const res = await api.get<AvailableCheckin & NoCheckin>(
        "/checkin/available",
      );
      if (res.aulaId) {
        setCheckin(res);
        if (res.alreadyCheckedIn) {
          setScreen("already");
        } else {
          setScreen("available");
        }
      } else {
        setNoCheckin(res);
        setScreen("none");
      }
    } catch {
      setNoCheckin({ message: "Erro ao buscar aula" });
      setScreen("none");
    }
  }, [actingAs]);

  useEffect(() => { fetchAvailable(); }, [fetchAvailable]);

  const handleConfirm = async () => {
    if (!checkin) return;
    setConfirming(true);
    try {
      await api.post("/checkin", { aulaId: checkin.aulaId });
      setScreen("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro";
      setNoCheckin({ message: msg });
      setScreen("none");
    } finally {
      setConfirming(false);
    }
  };

  // ── Success ──
  if (screen === "success") {
    return (
      <SuccessScreen
        title="Presença Confirmada!"
        message="Bom treino!"
        onDismiss={onDone}
      />
    );
  }

  // ── Already checked in ──
  if (screen === "already") {
    return (
      <SuccessScreen
        variant="warning"
        title="Presença já registrada"
        message={
          checkin
            ? `${checkin.modalityName} · ${checkin.startTime}`
            : ""
        }
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

  // ── No class available ──
  if (screen === "none") {
    const nc = noCheckin;
    return (
      <View style={styles.center}>
        <View style={styles.warningIcon}>
          <Feather
            name="alert-triangle"
            size={28}
            color={colors.warning}
          />
        </View>
        <Text style={styles.noTitle}>Nenhuma aula agora</Text>
        <Text style={styles.noMessage}>
          {nc?.message ||
            "Não há aulas em andamento para as suas turmas neste horário."}
        </Text>
        {nc?.nextClass && (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>Próxima aula:</Text>
            <Text style={styles.nextValue}>
              {nc.nextClass.modalityName} · {nc.nextClass.dayOfWeek}{" "}
              {nc.nextClass.startTime}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── Available — confirmation screen ──
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Hora do Treino</Text>
        <Text style={styles.sub}>
          Confirme sua presença na turma atual.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.modalityIcon}>
              <Feather name="award" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.modalityName}>
                {checkin!.modalityName}
              </Text>
              <Text style={styles.turmaName}>
                Turma {checkin!.turmaName}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Feather
              name="clock" size={16} color={colors.mutedForeground}
            />
            <View>
              <Text style={styles.detailText}>
                Hoje, {checkin!.startTime} - {checkin!.endTime}
              </Text>
              <Text style={styles.detailSub}>{checkin!.dayOfWeek}</Text>
            </View>
          </View>

          {checkin!.location && (
            <View style={styles.detailRow}>
              <Feather
                name="map-pin"
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={styles.detailText}>{checkin!.location}</Text>
            </View>
          )}

          {checkin!.teacher && (
            <View style={styles.detailRow}>
              <Feather
                name="user"
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={styles.detailText}>
                Prof. {checkin!.teacher}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Confirmar Presença"
          loading={confirming}
          onPress={handleConfirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  heading: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  sub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md + 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
  },
  modalityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(198,163,78,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalityName: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  turmaName: {
    color: colors.primary,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 4,
  },
  detailText: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 14,
  },
  detailSub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // No class
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  noTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  noMessage: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  nextCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  nextLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextValue: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
});
