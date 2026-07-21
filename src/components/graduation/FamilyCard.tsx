import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { PersonCard } from "./PersonCard";
import type { GradAction, GradCard, RosterFamily } from "./types";

interface FamilyCardProps {
  family: RosterFamily;
  busy: string | null;
  onAction: (action: GradAction, card: GradCard) => void;
  onOpenMenu: (card: GradCard) => void;
}

function familyNeedsAttention(family: RosterFamily): boolean {
  const people = [family.guardian, ...family.dependents];
  return people.some((p) =>
    p.graduations.some((g) => g.status === "pending" || g.status === "rejected"),
  );
}

export function FamilyCard({ family, busy, onAction, onOpenMenu }: FamilyCardProps) {
  const attn = familyNeedsAttention(family);
  const hasDeps = family.dependents.length > 0;
  const guardianRole = hasDeps
    ? "guardian"
    : family.guardianIsStudent
      ? "student"
      : "guardian";

  return (
    <View style={[styles.card, attn && styles.cardAttn]}>
      <PersonCard
        person={family.guardian}
        role={guardianRole}
        showGraduations={family.guardianIsStudent}
        busy={busy}
        onAction={onAction}
        onOpenMenu={onOpenMenu}
      />

      {hasDeps && (
        <View style={styles.deps}>
          <Text style={styles.depsHd}>
            Dependentes · {family.dependents.length}
          </Text>
          {family.dependents.map((dep) => (
            <View key={dep.userId} style={styles.dep}>
              <PersonCard
                person={dep}
                role="dependent"
                showGraduations
                busy={busy}
                onAction={onAction}
                onOpenMenu={onOpenMenu}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardAttn: {
    borderColor: colors.primaryBorder,
  },
  deps: {
    marginTop: spacing.md,
  },
  depsHd: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  dep: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryBorder,
    paddingLeft: spacing.sm + 4,
    marginLeft: spacing.xs,
    marginBottom: spacing.md,
  },
});
