/**
 * SelecaoTurmasScreen — reusable component for class selection.
 * Used for both dependents and the user themselves.
 * Context chip with name+age differentiates the subject (amber = dependent, gold = self).
 * Spec: US-01, Section 10.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeScreen } from "../ui/SafeScreen";
import { WizardHeader } from "./WizardHeader";
import { Button } from "../ui/Button";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import type { ClassOption } from "../../context/WizardContext";

interface SelecaoTurmasScreenProps {
  contextType: "self" | "dependent";
  personName: string;
  personAge?: number;
  roleLabel: string;
  classes: ClassOption[];
  loading?: boolean;
  error?: string | null;
  initialSelection: string[];
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  onBack: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

export function SelecaoTurmasScreen({
  contextType,
  personName,
  personAge,
  roleLabel,
  classes,
  loading,
  error,
  initialSelection,
  currentStep,
  totalSteps,
  stepLabel,
  onBack,
  onConfirm,
}: SelecaoTurmasScreenProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));

  function toggleClass(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const chipColor = contextType === "dependent" ? colors.warning : colors.primary;
  const chipBg =
    contextType === "dependent"
      ? "rgba(245,158,11,0.15)"
      : colors.primaryMuted;

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={onBack}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabel={stepLabel ?? `Etapa ${currentStep} · Turmas`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Context chip */}
        <View style={[styles.contextChip, { backgroundColor: chipBg }]}>
          <Text style={[styles.contextChipText, { color: chipColor }]}>
            {contextType === "dependent" ? "👶 " : "👤 "}
            {personName}
            {personAge !== undefined ? `, ${personAge} anos` : ""}
            {" · "}
            {roleLabel}
          </Text>
        </View>

        <Text style={styles.heading}>Escolha as turmas</Text>
        <Text style={styles.description}>
          {contextType === "dependent"
            ? `Selecione as turmas para ${personName.split(" ")[0]}.`
            : "Selecione as turmas em que deseja participar."}
        </Text>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyText}>Carregando turmas...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>Erro ao carregar turmas</Text>
            <Text style={styles.emptySubText}>{error}</Text>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyText}>Nenhuma turma disponível no momento.</Text>
            <Text style={styles.emptySubText}>
              A equipe irá orientá-lo sobre as turmas disponíveis após a aprovação da conta.
            </Text>
          </View>
        ) : (
          <View style={styles.classList}>
            {classes.map((cls) => {
              const isSelected = selected.has(cls.id);

              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.classCard, isSelected && styles.classCardSelected]}
                  onPress={() => toggleClass(cls.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.classCardLeft}>
                    <Text style={[styles.className, isSelected && styles.classNameSelected]}>
                      {cls.name}
                    </Text>
                    <Text style={styles.classInfo}>
                      {cls.modality} · {cls.schedule}
                    </Text>
                    {cls.teacher && (
                      <Text style={styles.classTeacher}>Prof. {cls.teacher}</Text>
                    )}
                    {cls.ageRange && (
                      <Text style={styles.classAgeRange}>
                        {cls.ageRange.min}–{cls.ageRange.max} anos
                      </Text>
                    )}
                  </View>
                  <View style={styles.classCardRight}>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <Button
            label={
              selected.size === 0
                ? "Pular (sem turmas)"
                : `Confirmar ${selected.size} turma${selected.size !== 1 ? "s" : ""}`
            }
            onPress={() => onConfirm(Array.from(selected))}
            variant={selected.size === 0 ? "outline" : "primary"}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  contextChip: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  contextChipText: {
    fontSize: 13,
    fontFamily: typography.fontBodyMedium,
    letterSpacing: 0.3,
  },
  heading: {
    fontSize: 22,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: 15,
    fontFamily: typography.fontBodyMedium,
    textAlign: "center",
  },
  emptySubText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontFamily: typography.fontBody,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  classList: {
    gap: spacing.sm,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  classCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  classCardLeft: {
    flex: 1,
    gap: 2,
  },
  className: {
    fontSize: 15,
    fontFamily: typography.fontBodySemiBold,
    color: colors.foreground,
  },
  classNameSelected: {
    color: colors.primary,
  },
  classInfo: {
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
  },
  classTeacher: {
    fontSize: 12,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
  },
  classAgeRange: {
    fontSize: 11,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  classCardRight: {
    marginLeft: spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
