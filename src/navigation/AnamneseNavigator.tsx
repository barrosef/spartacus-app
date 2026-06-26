import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AnamneseProvider } from "../context/AnamneseContext";
import { StepDailyActivities } from "../screens/anamnese/StepDailyActivities";
import { StepMedicalHistory } from "../screens/anamnese/StepMedicalHistory";
import { StepHealthBehavior } from "../screens/anamnese/StepHealthBehavior";
import { StepGoals } from "../screens/anamnese/StepGoals";
import { StepReview } from "../screens/anamnese/StepReview";
import { colors, typography, spacing } from "../theme/tokens";

// ── Screen types ────────────────────────────────────────────────────────────

export type AnamneseScreenName =
  | "StepDailyActivities"
  | "StepMedicalHistory"
  | "StepHealthBehavior"
  | "StepGoals"
  | "StepReview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCREENS: Record<AnamneseScreenName, React.ComponentType<any>> = {
  StepDailyActivities,
  StepMedicalHistory,
  StepHealthBehavior,
  StepGoals,
  StepReview,
};

// ── Target context (who is this anamnese for) ──────────────────────────────

export interface AnamneseTarget {
  uid: string;
  name: string;
  birthDate: string;
  isSelf: boolean;
}

interface AnamneseTargetContextValue {
  current: AnamneseTarget;
  index: number;
  total: number;
}

export const AnamneseTargetCtx = createContext<AnamneseTargetContextValue | null>(null);

export function useAnamneseTarget(): AnamneseTargetContextValue {
  const ctx = useContext(AnamneseTargetCtx);
  if (!ctx) throw new Error("useAnamneseTarget must be used within AnamneseNavigator");
  return ctx;
}

// ── Navigation context ──────────────────────────────────────────────────────

interface AnamneseNavigation {
  navigate: (screen: AnamneseScreenName) => void;
  goBack: () => void;
}

export const AnamneseNavCtx = createContext<AnamneseNavigation | null>(null);

export function useAnamneseNavigation(): AnamneseNavigation {
  const ctx = useContext(AnamneseNavCtx);
  if (!ctx) throw new Error("useAnamneseNavigation must be used within AnamneseNavigator");
  return ctx;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function calculateAge(birthDate: string): number {
  const [day, month, year] = birthDate.split("/").map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ── Navigator ───────────────────────────────────────────────────────────────

interface Props {
  /** Queue of users that need anamnese — self first, then dependents */
  targets: AnamneseTarget[];
  onAllSubmitted: () => void;
}

export function AnamneseNavigator({ targets, onAllSubmitted }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = targets[currentIndex];

  // Reset stack key forces a fresh AnamneseProvider + reset stack on each target
  const [resetKey, setResetKey] = useState(0);

  const userAge = useMemo(
    () => calculateAge(current?.birthDate ?? ""),
    [current],
  );
  const firstScreen: AnamneseScreenName =
    userAge >= 16 ? "StepDailyActivities" : "StepMedicalHistory";

  const [stack, setStack] = useState<AnamneseScreenName[]>([firstScreen]);

  const navigate = useCallback((screen: AnamneseScreenName) => {
    setStack((prev) => [...prev, screen]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleSubmitted = useCallback(() => {
    if (currentIndex + 1 < targets.length) {
      // Advance to next target — reset state
      setCurrentIndex(currentIndex + 1);
      const nextAge = calculateAge(targets[currentIndex + 1].birthDate);
      setStack([nextAge >= 16 ? "StepDailyActivities" : "StepMedicalHistory"]);
      setResetKey((k) => k + 1);
    } else {
      onAllSubmitted();
    }
  }, [currentIndex, targets, onAllSubmitted]);

  if (!current) {
    return null;
  }

  const Screen = SCREENS[stack[stack.length - 1]];

  return (
    <AnamneseTargetCtx.Provider
      value={{ current, index: currentIndex, total: targets.length }}
    >
      <AnamneseNavCtx.Provider value={{ navigate, goBack }}>
        <AnamneseProvider key={resetKey} userAge={userAge}>
          {targets.length > 1 || !current.isSelf ? (
            <TargetBanner
              target={current}
              index={currentIndex}
              total={targets.length}
            />
          ) : null}
          <Screen onSubmitted={handleSubmitted} />
        </AnamneseProvider>
      </AnamneseNavCtx.Provider>
    </AnamneseTargetCtx.Provider>
  );
}

// ── Banner ──────────────────────────────────────────────────────────────────

function TargetBanner({
  target,
  index,
  total,
}: {
  target: AnamneseTarget;
  index: number;
  total: number;
}) {
  return (
    <View style={styles.banner}>
      <Feather
        name={target.isSelf ? "user" : "users"}
        size={16}
        color={colors.primary}
      />
      <View style={styles.bannerText}>
        <Text style={styles.bannerLabel}>
          {target.isSelf
            ? "Sua anamnese"
            : `Anamnese de ${target.name}`}
        </Text>
        {total > 1 && (
          <Text style={styles.bannerCount}>
            {index + 1} de {total}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(198,163,78,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(198,163,78,0.3)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bannerText: {
    flex: 1,
  },
  bannerLabel: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
  },
  bannerCount: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
    marginTop: 1,
  },
});
