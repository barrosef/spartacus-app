import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { auth } from "../../lib/firebase";
import { api, ApiError } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Button } from "../../components/ui/Button";
import { AnamneseStepsHost } from "../anamnese/AnamneseStepsHost";
import type { AnamneseTarget } from "../../navigation/AnamneseNavigator";
import { colors, typography, spacing, radius } from "../../theme/tokens";

// ── Types ────────────────────────────────────────────────────────────────────

type AnamneseStatus =
  | "not_started"
  | "pending_approval"
  | "approved"
  | "needs_revision";

interface MedicalHistoryResponse {
  status: AnamneseStatus;
  reviewNote?: string | null;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AnamneseStatus, string> = {
  not_started: "Não preenchida",
  pending_approval: "Em análise",
  approved: "Aprovada",
  needs_revision: "Revisão solicitada",
};

const STATUS_COLOR: Record<AnamneseStatus, string> = {
  not_started: colors.mutedForeground,
  pending_approval: colors.warning,
  approved: colors.success,
  needs_revision: colors.error,
};

// ── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function AnamneseProfileScreen({ onBack }: Props) {
  const { actingAs } = useProxy();
  const currentUid = auth.currentUser?.uid ?? "";
  const targetUid = actingAs ?? currentUid;

  const [status, setStatus] = useState<AnamneseStatus | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [userBirthDate, setUserBirthDate] = useState("01/01/2000");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;

      const data = await api.get<MedicalHistoryResponse>(
        `/medical-history/${targetUid}`,
        { headers },
      );
      setStatus(data.status);
      setReviewNote(data.reviewNote ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("not_started");
        setReviewNote(null);
      } else {
        setFetchError("Não foi possível carregar a ficha de saúde.");
      }
    } finally {
      setLoading(false);
    }
  }, [actingAs, targetUid]);

  const fetchBirthDate = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<{ birthDate?: string }>(
        "/users/me/profile",
        { headers },
      );
      const date = data.birthDate;
      if (date) setUserBirthDate(date);
    } catch {
      // use default — steps can still run
    }
  }, [actingAs]);

  useEffect(() => {
    fetchStatus();
    fetchBirthDate();
  }, [fetchStatus, fetchBirthDate]);

  const handleStartSteps = useCallback(() => {
    setShowSteps(true);
  }, []);

  const handleStepsSubmitted = useCallback(() => {
    setShowSteps(false);
    fetchStatus();
  }, [fetchStatus]);

  // ── Step flow ───────────────────────────────────────────────────────────────

  if (showSteps) {
    const target: AnamneseTarget = {
      uid: targetUid,
      name: "",        // banner not shown when total === 1
      birthDate: userBirthDate,
      isSelf: !actingAs,
    };
    return (
      <AnamneseStepsHost
        target={target}
        onSubmitted={handleStepsSubmitted}
      />
    );
  }

  // ── Status view ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={24}
          color={colors.foreground}
          onPress={onBack}
        />
        <Text style={styles.headerTitle}>Ficha de saúde</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : fetchError ? (
          <View style={styles.statusCard}>
            <Text style={[styles.statusLabel, { color: colors.error }]}>
              {fetchError}
            </Text>
          </View>
        ) : (
          <>
            {/* Status card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Feather
                  name="activity"
                  size={20}
                  color={STATUS_COLOR[status ?? "not_started"]}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    { color: STATUS_COLOR[status ?? "not_started"] },
                  ]}
                >
                  {STATUS_LABEL[status ?? "not_started"]}
                </Text>
              </View>

              {status === "needs_revision" && reviewNote ? (
                <View style={styles.reviewNoteBox}>
                  <Text style={styles.reviewNoteTitle}>Observação do assistente</Text>
                  <Text style={styles.reviewNoteText}>{reviewNote}</Text>
                </View>
              ) : null}

              {status === "not_started" && (
                <Text style={styles.statusDescription}>
                  A ficha de saúde ainda não foi preenchida. Preencha agora para
                  que a equipe possa acompanhar seu histórico de saúde.
                </Text>
              )}

              {status === "pending_approval" && (
                <Text style={styles.statusDescription}>
                  Sua ficha foi enviada e está aguardando análise pela equipe.
                </Text>
              )}

              {status === "approved" && (
                <Text style={styles.statusDescription}>
                  Sua ficha de saúde foi aprovada pela equipe.
                </Text>
              )}
            </View>

            {/* Action button */}
            {(status === "not_started" || status === "needs_revision") && (
              <View style={styles.buttonWrap}>
                <Button
                  label={
                    status === "not_started" ? "Preencher" : "Editar e reenviar"
                  }
                  onPress={handleStartSteps}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: typography.fontBodySemiBold,
    fontSize: 16,
    color: colors.foreground,
  },
  headerSpacer: {
    width: 24,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingWrap: {
    flex: 1,
    marginTop: spacing.xxl,
    alignItems: "center",
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusLabel: {
    fontFamily: typography.fontBodySemiBold,
    fontSize: 15,
  },
  statusDescription: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  reviewNoteBox: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    padding: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  reviewNoteTitle: {
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
    color: colors.error,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  reviewNoteText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },
  buttonWrap: {
    marginTop: spacing.md,
  },
});
