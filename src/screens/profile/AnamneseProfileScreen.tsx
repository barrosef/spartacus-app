import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { auth } from "../../lib/firebase";
import { api, ApiError } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { Button } from "../../components/ui/Button";
import { AnamneseStepsHost } from "../anamnese/AnamneseStepsHost";
import {
  AnamneseSummary,
  type AnamneseSummaryData,
} from "../../components/anamnese/AnamneseSummary";
import type { AnamneseTarget } from "../../navigation/AnamneseNavigator";
import type { AnamneseState } from "../../context/AnamneseContext";
import { colors, typography, spacing, radius } from "../../theme/tokens";

// ── Types ────────────────────────────────────────────────────────────────────

type AnamneseStatus =
  | "not_started"
  | "pending_approval"
  | "approved"
  | "needs_revision";

interface MedicalHistoryResponse extends AnamneseSummaryData {
  status: AnamneseStatus;
  reviewNote?: string | null;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Exclude<AnamneseStatus, "not_started">, string> = {
  pending_approval: "Em análise",
  approved: "Aprovada",
  needs_revision: "Revisão solicitada",
};

const STATUS_COLOR: Record<Exclude<AnamneseStatus, "not_started">, string> = {
  pending_approval: colors.warning,
  approved: colors.success,
  needs_revision: colors.error,
};

const STATUS_DESCRIPTION: Record<Exclude<AnamneseStatus, "not_started">, string> = {
  pending_approval: "Sua ficha foi enviada e está aguardando análise pela equipe.",
  approved: "Sua ficha de saúde foi aprovada pela equipe.",
  needs_revision: "A equipe pediu ajustes na sua ficha. Edite e reenvie.",
};

// Map the backend response into the flat wizard state (for editing).
function responseToState(data: MedicalHistoryResponse): Partial<AnamneseState> {
  const mh = data.medicalHistory ?? {};
  const hb = data.healthBehavior ?? {};
  const da = data.dailyActivities ?? undefined;
  return {
    weeklyWorkHours: da?.weeklyWorkHours ?? "",
    workActivities: da?.workActivities ?? [],
    workActivitiesNotes: da?.workActivitiesNotes ?? "",
    lastMedicalExamDate: mh.lastMedicalExamDate ?? "",
    familyHeartDisease: mh.familyHeartDisease ?? [],
    surgeries: mh.surgeries ?? [],
    surgeriesOther: mh.surgeriesOther ?? "",
    diagnosedConditions: mh.diagnosedConditions ?? [],
    diagnosedConditionsOther: mh.diagnosedConditionsOther ?? "",
    currentMedications: mh.currentMedications ?? "",
    symptoms: (mh.symptoms ?? {}) as AnamneseState["symptoms"],
    hasAllergies: mh.hasAllergies ?? null,
    allergiesDetails: mh.allergiesDetails ?? "",
    hasRecentInjury: mh.hasRecentInjury ?? null,
    injuryDetails: mh.injuryDetails ?? "",
    hasExerciseRestriction: mh.hasExerciseRestriction ?? null,
    restrictionDetails: mh.restrictionDetails ?? "",
    smokes: hb.smokes ?? null,
    cigarettesPerDay: hb.cigarettesPerDay ?? "",
    practicesPhysicalActivity: hb.practicesPhysicalActivity ?? null,
    physicalActivityDescription: hb.physicalActivityDescription ?? "",
    physicalActivityFrequency: hb.physicalActivityFrequency ?? "",
    physicalActivityDuration: hb.physicalActivityDuration ?? "",
    goals: data.goals ?? [],
    goalsOther: data.goalsOther ?? "",
    generalComments: data.generalComments ?? "",
  };
}

// ── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function AnamneseProfileScreen({ onBack }: Props) {
  const { actingAs } = useProxy();
  const currentUid = auth.currentUser?.uid ?? "";
  const targetUid = actingAs ?? currentUid;

  const [data, setData] = useState<MedicalHistoryResponse | null>(null);
  const [status, setStatus] = useState<AnamneseStatus | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false); // edit mode (filled → wizard)
  const [editInitial, setEditInitial] = useState<Partial<AnamneseState> | undefined>();
  const [userBirthDate, setUserBirthDate] = useState("01/01/2000");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const res = await api.get<MedicalHistoryResponse>(
        `/medical-history/${targetUid}`,
        { headers },
      );
      setData(res);
      setStatus(res.status);
      setReviewNote(res.reviewNote ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setData(null);
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
      const profile = await api.get<{ birthDate?: string }>("/users/me/profile", {
        headers,
      });
      if (profile.birthDate) setUserBirthDate(profile.birthDate);
    } catch {
      // default keeps the wizard usable
    }
  }, [actingAs]);

  useEffect(() => {
    fetchStatus();
    fetchBirthDate();
  }, [fetchStatus, fetchBirthDate]);

  const handleStartEdit = useCallback(() => {
    if (data) setEditInitial(responseToState(data));
    setShowSteps(true);
  }, [data]);

  const handleExit = useCallback(() => {
    if (showSteps) {
      // editing an existing anamnese → return to the read-only summary
      setShowSteps(false);
      setEditInitial(undefined);
    } else {
      // fresh fill (not_started) → leave to the profile
      onBack();
    }
  }, [showSteps, onBack]);

  const handleStepsSubmitted = useCallback(() => {
    setShowSteps(false);
    setEditInitial(undefined);
    fetchStatus();
  }, [fetchStatus]);

  // ── Wizard: fresh fill (not_started) OR editing an existing anamnese ─────────

  const wizardActive =
    showSteps || (!loading && !fetchError && status === "not_started");

  if (wizardActive) {
    const target: AnamneseTarget = {
      uid: targetUid,
      name: "",
      birthDate: userBirthDate,
      isSelf: !actingAs,
    };
    return (
      <AnamneseStepsHost
        target={target}
        onSubmitted={handleStepsSubmitted}
        onExit={handleExit}
        initialState={editInitial}
      />
    );
  }

  // ── Read-only summary (filled) ───────────────────────────────────────────────

  const filledStatus =
    status && status !== "not_started"
      ? (status as Exclude<AnamneseStatus, "not_started">)
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
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
        ) : filledStatus && data ? (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Feather name="activity" size={20} color={STATUS_COLOR[filledStatus]} />
                <Text style={[styles.statusLabel, { color: STATUS_COLOR[filledStatus] }]}>
                  {STATUS_LABEL[filledStatus]}
                </Text>
              </View>
              <Text style={styles.statusDescription}>
                {STATUS_DESCRIPTION[filledStatus]}
              </Text>
              {filledStatus === "needs_revision" && reviewNote ? (
                <View style={styles.reviewNoteBox}>
                  <Text style={styles.reviewNoteTitle}>Observação da equipe</Text>
                  <Text style={styles.reviewNoteText}>{reviewNote}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.summaryWrap}>
              <AnamneseSummary data={data} />
            </View>

            <View style={styles.buttonWrap}>
              <Button label="Editar ficha" onPress={handleStartEdit} />
            </View>
          </>
        ) : null}
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
    marginBottom: spacing.md,
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
  summaryWrap: {
    marginBottom: spacing.md,
  },
  buttonWrap: {
    marginTop: spacing.xs,
  },
});
