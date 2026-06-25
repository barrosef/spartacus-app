/**
 * AnamneseSummary
 *
 * Read-only, presentational summary of an entire anamnese (health
 * questionnaire). Fed the same nested shape the backend returns and the
 * wizard builds for submission. Reused by:
 *  - AnamneseProfileScreen (profile read-only view, fed from the backend)
 *  - StepReview (wizard confirmation step, fed from the in-progress form)
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

// ── Label maps (mirror the option keys used across the wizard steps) ──────────

const WEEKLY_HOURS_LABELS: Record<string, string> = {
  less_than_20: "Menos de 20h",
  "20_to_40": "20 a 40h",
  "41_to_60": "41 a 60h",
  more_than_60: "Mais de 60h",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sitting: "Sentado",
  lifting_weights: "Carregando peso",
  standing: "Em pé",
  walking: "Caminhando",
  driving: "Dirigindo",
  other: "Outro",
};

const FAMILY_LABELS: Record<string, string> = {
  father: "Pai",
  mother: "Mãe",
  sibling: "Irmão/Irmã",
  grandparent: "Avô/Avó",
};

const SURGERY_LABELS: Record<string, string> = {
  spine: "Coluna",
  heart: "Coração",
  joint: "Articulação",
  herniated_disc: "Hérnia de disco",
  kidney: "Rim",
  lung: "Pulmão",
  eyes: "Olhos",
  other: "Outra",
};

const CONDITION_LABELS: Record<string, string> = {
  high_blood_pressure: "Hipertensão",
  diabetes: "Diabetes",
  asthma: "Asma",
  arthritis: "Artrite",
  obesity: "Obesidade",
  anemia: "Anemia",
  stroke: "AVC",
  kidney_disease: "Doença renal",
  emphysema: "Enfisema",
  ulcer: "Úlcera",
  eye_problems: "Problemas oculares",
  muscle_problems: "Problemas musculares",
  alcoholism: "Alcoolismo",
  other: "Outra",
};

const GOAL_LABELS: Record<string, string> = {
  discipline: "Disciplina",
  self_defense: "Defesa pessoal",
  socialization: "Socialização",
  health: "Saúde",
  competition: "Competição",
  physical_conditioning: "Condicionamento físico",
  therapeutic: "Terapêutico",
  leisure: "Lazer",
  other: "Outro",
};

const SYMPTOM_LABELS: { key: string; label: string }[] = [
  { key: "coughingBlood", label: "Tosse com sangue" },
  { key: "abdominalPain", label: "Dor abdominal" },
  { key: "legPain", label: "Dor nas pernas" },
  { key: "armPain", label: "Dor nos braços" },
  { key: "backNeckPain", label: "Dor nas costas ou pescoço" },
  { key: "chestPain", label: "Dor no peito" },
  { key: "jointPain", label: "Dores articulares" },
  { key: "shortnessOfBreath", label: "Falta de ar com esforço leve" },
  { key: "feelingWeak", label: "Sentir-se fraco" },
  { key: "dizziness", label: "Tontura" },
  { key: "heartPalpitation", label: "Palpitação cardíaca" },
];

const FREQ_LABELS: Record<string, string> = {
  always: "Sempre",
  sometimes: "Às vezes",
  never: "Nunca",
};

const DASH = "—";

function list(keys: string[] | undefined, map: Record<string, string>): string {
  if (!keys || keys.length === 0) return DASH;
  return keys.map((k) => map[k] ?? k).join(", ");
}

function text(v: string | undefined | null): string {
  return v && v.trim() ? v : DASH;
}

function boolDetail(flag: boolean | undefined | null, detail: string | undefined): string {
  if (flag == null) return DASH;
  if (!flag) return "Não";
  return detail && detail.trim() ? `Sim — ${detail}` : "Sim";
}

// ── Data shape (matches backend MedicalHistoryOut / wizard buildPayload) ──────

export interface AnamneseSummaryData {
  medicalHistory: {
    lastMedicalExamDate?: string;
    familyHeartDisease?: string[];
    surgeries?: string[];
    surgeriesOther?: string;
    diagnosedConditions?: string[];
    diagnosedConditionsOther?: string;
    currentMedications?: string;
    symptoms?: Record<string, string>;
    hasAllergies?: boolean;
    allergiesDetails?: string;
    hasRecentInjury?: boolean;
    injuryDetails?: string;
    hasExerciseRestriction?: boolean;
    restrictionDetails?: string;
  };
  healthBehavior: {
    smokes?: boolean;
    cigarettesPerDay?: string;
    practicesPhysicalActivity?: boolean;
    physicalActivityDescription?: string;
    physicalActivityFrequency?: string;
    physicalActivityDuration?: string;
  };
  dailyActivities?: {
    weeklyWorkHours?: string;
    workActivities?: string[];
    workActivitiesNotes?: string;
  } | null;
  goals?: string[];
  goalsOther?: string;
  generalComments?: string;
}

interface Props {
  data: AnamneseSummaryData;
}

export function AnamneseSummary({ data }: Props) {
  const mh = data.medicalHistory ?? {};
  const hb = data.healthBehavior ?? {};
  const da = data.dailyActivities ?? undefined;

  return (
    <View style={styles.container}>
      {da && (
        <Section title="Atividades Diárias">
          <Row
            label="Horas de trabalho"
            value={
              da?.weeklyWorkHours
                ? WEEKLY_HOURS_LABELS[da.weeklyWorkHours] ?? da.weeklyWorkHours
                : DASH
            }
          />
          <Row label="Atividades" value={list(da?.workActivities, ACTIVITY_LABELS)} />
          <Row label="Observações" value={text(da?.workActivitiesNotes)} />
        </Section>
      )}

      <Section title="Histórico Médico">
        <Row label="Último exame médico" value={text(mh.lastMedicalExamDate)} />
        <Row label="Doença cardíaca na família" value={list(mh.familyHeartDisease, FAMILY_LABELS)} />
        <Row
          label="Cirurgias"
          value={
            mh.surgeries && mh.surgeries.length
              ? list(mh.surgeries, SURGERY_LABELS) +
                (mh.surgeries.includes("other") && mh.surgeriesOther
                  ? ` (${mh.surgeriesOther})`
                  : "")
              : DASH
          }
        />
        <Row
          label="Condições diagnosticadas"
          value={
            mh.diagnosedConditions && mh.diagnosedConditions.length
              ? list(mh.diagnosedConditions, CONDITION_LABELS) +
                (mh.diagnosedConditions.includes("other") && mh.diagnosedConditionsOther
                  ? ` (${mh.diagnosedConditionsOther})`
                  : "")
              : DASH
          }
        />
        <Row label="Medicamentos em uso" value={text(mh.currentMedications)} />
        <Row label="Alergias" value={boolDetail(mh.hasAllergies, mh.allergiesDetails)} />
        <Row label="Lesão recente" value={boolDetail(mh.hasRecentInjury, mh.injuryDetails)} />
        <Row label="Restrição para exercícios" value={boolDetail(mh.hasExerciseRestriction, mh.restrictionDetails)} />
      </Section>

      <Section title="Sintomas">
        {SYMPTOM_LABELS.map((s) => (
          <Row
            key={s.key}
            label={s.label}
            value={FREQ_LABELS[mh.symptoms?.[s.key] ?? ""] ?? DASH}
          />
        ))}
      </Section>

      <Section title="Saúde">
        <Row label="Fuma" value={boolDetail(hb.smokes, hb.cigarettesPerDay ? `${hb.cigarettesPerDay}/dia` : undefined)} />
        <Row
          label="Pratica atividade física"
          value={boolDetail(hb.practicesPhysicalActivity, hb.physicalActivityDescription)}
        />
        {hb.practicesPhysicalActivity && (
          <>
            <Row label="Frequência" value={text(hb.physicalActivityFrequency)} />
            <Row label="Duração" value={text(hb.physicalActivityDuration)} />
          </>
        )}
      </Section>

      <Section title="Objetivos">
        <Row label="Selecionados" value={list(data.goals, GOAL_LABELS)} />
        {data.goals?.includes("other") && <Row label="Outro" value={text(data.goalsOther)} />}
      </Section>

      <Section title="Comentários gerais">
        <Row label="" value={text(data.generalComments)} fullWidth />
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  if (fullWidth) {
    return (
      <View style={styles.rowFull}>
        {label ? <Text style={styles.rowLabel}>{label}</Text> : null}
        <Text style={styles.rowValueFull}>{value}</Text>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md + 4,
  },
  section: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: "rgba(198,163,78,0.06)",
  },
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
  },
  rowFull: {
    paddingVertical: spacing.xs + 2,
    gap: 2,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: colors.foreground,
    flex: 2,
    textAlign: "right",
  },
  rowValueFull: {
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: colors.foreground,
    lineHeight: 19,
  },
});
