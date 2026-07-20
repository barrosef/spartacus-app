import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme/tokens";
import { UserAvatar } from "../ui/UserAvatar";
import { GraduationBlock } from "./GraduationBlock";
import type { GradAction, GradCard, RosterPerson } from "./types";

interface PersonCardProps {
  person: RosterPerson;
  role: "guardian" | "dependent" | "student";
  showGraduations: boolean;
  busy: string | null;   // "userId_modalitySlug" currently acting, or null
  onAction: (action: GradAction, card: GradCard) => void;
  onOpenMenu: (card: GradCard) => void;
}

const ROLE_LABEL: Record<string, string> = {
  guardian: "Responsável",
  dependent: "Dependente",
  student: "Aluno",
};

export function PersonCard({
  person,
  role,
  showGraduations,
  busy,
  onAction,
  onOpenMenu,
}: PersonCardProps) {
  return (
    <View>
      <View style={styles.head}>
        <UserAvatar name={person.name} photoUrl={person.photoUrl} size={44} />
        <View style={styles.id}>
          <Text style={styles.name}>{person.displayName}</Text>
          <Text style={styles.role}>{ROLE_LABEL[role]}</Text>
          <View style={styles.chips}>
            {person.age != null && (
              <View style={styles.chip}>
                <Text style={styles.chipAge}>{person.age}</Text>
                <Text style={styles.chipText}> anos</Text>
              </View>
            )}
            {person.turmas.map((t, i) => (
              <View key={`${t.modalityName}-${i}`} style={styles.chip}>
                <Text style={styles.chipText}>
                  {t.modalityName}
                  {t.className ? ` · ${t.className}` : ""}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {showGraduations && person.graduations.length > 0 && (
        <View style={styles.grads}>
          {person.graduations.map((card) => (
            <GraduationBlock
              key={`${card.userId}-${card.modalitySlug}`}
              card={card}
              busy={busy === `${card.userId}_${card.modalitySlug}`}
              onAction={onAction}
              onOpenMenu={onOpenMenu}
            />
          ))}
        </View>
      )}

      {showGraduations && person.graduations.length === 0 && (
        <Text style={styles.emptyAll}>Graduação não preenchida</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    gap: spacing.sm + 4,
    alignItems: "flex-start",
  },
  id: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  role: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipAge: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
  },
  chipText: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 11,
  },
  grads: {
    gap: spacing.sm,
    marginTop: spacing.sm + 4,
  },
  emptyAll: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
});
