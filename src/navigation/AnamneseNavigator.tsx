import React, { createContext, useContext, useState, useCallback } from "react";
import { AnamneseProvider } from "../context/AnamneseContext";
import { StepDailyActivities } from "../screens/anamnese/StepDailyActivities";
import { StepMedicalHistory } from "../screens/anamnese/StepMedicalHistory";
import { StepHealthBehavior } from "../screens/anamnese/StepHealthBehavior";
import { StepGoals } from "../screens/anamnese/StepGoals";
import { StepReview } from "../screens/anamnese/StepReview";

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

// ── Navigation context ──────────────────────────────────────────────────────

interface AnamneseNavigation {
  navigate: (screen: AnamneseScreenName) => void;
  goBack: () => void;
}

const AnamneseNavCtx = createContext<AnamneseNavigation | null>(null);

export function useAnamneseNavigation(): AnamneseNavigation {
  const ctx = useContext(AnamneseNavCtx);
  if (!ctx) throw new Error("useAnamneseNavigation must be used within AnamneseNavigator");
  return ctx;
}

// ── Navigator ───────────────────────────────────────────────────────────────

interface Props {
  birthDate: string;
  onSubmitted: () => void;
}

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

export function AnamneseNavigator({ birthDate, onSubmitted }: Props) {
  const userAge = calculateAge(birthDate);
  const firstScreen: AnamneseScreenName =
    userAge >= 16 ? "StepDailyActivities" : "StepMedicalHistory";

  const [stack, setStack] = useState<AnamneseScreenName[]>([firstScreen]);

  const navigate = useCallback((screen: AnamneseScreenName) => {
    setStack((prev) => [...prev, screen]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const current = stack[stack.length - 1];
  const Screen = SCREENS[current];

  return (
    <AnamneseNavCtx.Provider value={{ navigate, goBack }}>
      <AnamneseProvider userAge={userAge}>
        <Screen onSubmitted={onSubmitted} />
      </AnamneseProvider>
    </AnamneseNavCtx.Provider>
  );
}
