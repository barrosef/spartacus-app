import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../theme/tokens";
import { NO_GRADUATION_COLOR } from "../../lib/belts";
import { getModalityInitials, isLightColor } from "./beltVisual";

interface BeltRibbonProps {
  modalityName: string;
  color?: string | null;
  degree?: number;
  empty?: boolean;
}

/**
 * Vertical belt ribbon (bookmark): belt color body + degree ticks near the
 * notched tip + modality initials. Never shows the NEXT belt — current only.
 * Mirrors the backoffice GraduationBadge.
 */
export function BeltRibbon({
  modalityName,
  color,
  degree = 0,
  empty = false,
}: BeltRibbonProps) {
  const fill = empty ? colors.card : color || NO_GRADUATION_COLOR;
  const light = isLightColor(fill);
  const ink = light ? "#1B1B1B" : "#F2F2F2";
  const ticks = Math.max(0, Math.min(4, degree));

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.body,
          { backgroundColor: fill },
          empty && styles.bodyEmpty,
          light && styles.bodyLightBorder,
        ]}
      >
        <Text style={[styles.ini, { color: empty ? colors.mutedForeground : ink }]}>
          {getModalityInitials(modalityName)}
        </Text>
        {ticks > 0 && (
          <View style={styles.ticks}>
            {Array.from({ length: ticks }).map((_, i) => (
              <View key={i} style={[styles.tick, { backgroundColor: ink }]} />
            ))}
          </View>
        )}
      </View>
      {/* notch: triangle in the screen bg color cutting the bottom center */}
      <View style={styles.notch} />
    </View>
  );
}

const RIBBON_W = 24;

const styles = StyleSheet.create({
  wrap: {
    width: RIBBON_W,
    height: 78,
    alignItems: "center",
  },
  body: {
    width: RIBBON_W,
    height: 78,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: "center",
    paddingTop: 7,
  },
  bodyEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  bodyLightBorder: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
  ini: {
    fontFamily: typography.fontHeadingSemi,
    fontSize: 9,
    letterSpacing: 1,
  },
  ticks: {
    position: "absolute",
    bottom: 12,
    alignItems: "center",
    gap: 3,
  },
  tick: {
    width: RIBBON_W - 8,
    height: 2,
    borderRadius: 1,
  },
  notch: {
    position: "absolute",
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: RIBBON_W / 2,
    borderRightWidth: RIBBON_W / 2,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.background, // cuts an inverted-V into the ribbon
  },
});
