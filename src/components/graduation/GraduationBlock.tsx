import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { Button } from "../ui/Button";
import { BeltRibbon } from "./BeltRibbon";
import type { GradAction, GradCard } from "./types";

interface GraduationBlockProps {
  card: GradCard;
  busy: boolean;
  onAction: (action: GradAction, card: GradCard) => void;
  onOpenMenu: (card: GradCard) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Reprovada",
  none: "—",
};

export function GraduationBlock({ card, busy, onAction, onOpenMenu }: GraduationBlockProps) {
  const isNone = card.status === "none";
  const beltLabel = card.beltName ?? card.belt ?? "Sem faixa";
  const showDegree = card.degree > 0 && card.maxDegree > 0;
  const hasMenu = card.canAddDegree || !!card.nextBelt || card.canUndo;

  return (
    <View
      style={[
        styles.block,
        card.status === "pending" && styles.blockPending,
        card.status === "rejected" && styles.blockRejected,
      ]}
    >
      <BeltRibbon
        modalityName={card.modalityName}
        color={card.color}
        degree={card.degree}
        empty={isNone}
      />

      <View style={styles.main}>
        <Text style={styles.modality}>{card.modalityName}</Text>
        {isNone ? (
          <Text style={styles.empty}>Graduação não preenchida</Text>
        ) : (
          <Text style={styles.belt}>
            {beltLabel}
            {showDegree && <Text style={styles.degree}>{`  ·  ${card.degree}º grau`}</Text>}
          </Text>
        )}

        {card.outOfBand ? (
          <Text style={styles.warn}>⚠ faixa fora da faixa etária atual</Text>
        ) : (
          card.nextBelt && (
            <View style={styles.next}>
              <Text style={styles.nextLabel}>PRÓXIMA</Text>
              <View style={[styles.nextDot, { backgroundColor: card.nextBelt.color }]} />
              <Text style={styles.nextName}>{card.nextBelt.name}</Text>
            </View>
          )
        )}
      </View>

      <View style={styles.side}>
        <View style={[styles.pill, pillStyle(card.status)]}>
          <Text style={[styles.pillText, pillTextStyle(card.status)]}>
            {STATUS_LABEL[card.status] ?? card.status}
          </Text>
        </View>

        {(card.status === "pending" || card.status === "rejected") && (
          <View style={styles.actions}>
            {card.status === "pending" && (
              <Button
                label="Reprovar"
                variant="outline"
                disabled={busy}
                onPress={() => onAction("reject", card)}
                style={styles.smallBtn}
                textStyle={styles.rejectText}
              />
            )}
            <Button
              label="Aprovar"
              variant="primary"
              loading={busy}
              disabled={busy}
              onPress={() => onAction("approve", card)}
              style={styles.smallBtn}
            />
          </View>
        )}

        {card.status === "approved" && hasMenu && (
          <TouchableOpacity
            style={styles.kebab}
            onPress={() => onOpenMenu(card)}
            hitSlop={8}
            disabled={busy}
          >
            <Feather name="more-vertical" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function pillStyle(status: string) {
  if (status === "pending") return styles.pillPending;
  if (status === "approved") return styles.pillApproved;
  if (status === "rejected") return styles.pillRejected;
  return styles.pillNeutral;
}
function pillTextStyle(status: string) {
  if (status === "pending") return { color: colors.primary };
  if (status === "approved") return { color: colors.success };
  if (status === "rejected") return { color: colors.error };
  return { color: colors.mutedForeground };
}

const styles = StyleSheet.create({
  block: {
    flexDirection: "row",
    gap: spacing.sm + 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  blockPending: {
    borderColor: colors.primaryBorder,
    backgroundColor: "rgba(198,163,78,0.05)",
  },
  blockRejected: {
    borderColor: "rgba(239,68,68,0.35)",
  },
  main: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  modality: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  belt: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 15,
  },
  degree: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
  empty: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontStyle: "italic",
  },
  next: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  nextLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  nextDot: {
    width: 11,
    height: 11,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.4)",
  },
  nextName: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
  },
  warn: {
    color: colors.error,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
    marginTop: 3,
  },
  side: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  pill: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: typography.fontBodySemiBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pillPending: { backgroundColor: "rgba(198,163,78,0.10)", borderColor: colors.primaryBorder },
  pillApproved: { backgroundColor: "rgba(76,175,80,0.12)", borderColor: "rgba(76,175,80,0.35)" },
  pillRejected: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" },
  pillNeutral: { backgroundColor: colors.card, borderColor: colors.border },
  actions: {
    flexDirection: "row",
    gap: spacing.xs + 2,
  },
  smallBtn: {
    height: 36,
    paddingHorizontal: spacing.sm + 4,
  },
  rejectText: {
    color: colors.error,
  },
  kebab: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
