/**
 * AnamneseStepsHost
 *
 * Reusable orchestrator for the multi-step anamnese flow for a single target
 * (self or dependent). Provides AnamneseTargetCtx, AnamneseNavCtx and
 * AnamneseProvider; renders the current step.
 *
 * Used by:
 *  - AnamneseNavigator (blocking gate, iterates multiple targets)
 *  - AnamneseProfileScreen (profile sub-screen, single target)
 */

import React, { useState, useCallback, useMemo } from "react";
import { AnamneseProvider } from "../../context/AnamneseContext";
import { StepDailyActivities } from "./StepDailyActivities";
import { StepMedicalHistory } from "./StepMedicalHistory";
import { StepHealthBehavior } from "./StepHealthBehavior";
import { StepGoals } from "./StepGoals";
import { StepReview } from "./StepReview";
import {
  AnamneseTargetCtx,
  AnamneseNavCtx,
  type AnamneseScreenName,
  type AnamneseTarget,
} from "../../navigation/AnamneseNavigator";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCREENS: Record<AnamneseScreenName, React.ComponentType<any>> = {
  StepDailyActivities,
  StepMedicalHistory,
  StepHealthBehavior,
  StepGoals,
  StepReview,
};

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

interface Props {
  target: AnamneseTarget;
  /** Index and total are used only for multi-target banners; default to 0/1 */
  index?: number;
  total?: number;
  onSubmitted: () => void;
}

export function AnamneseStepsHost({
  target,
  index = 0,
  total = 1,
  onSubmitted,
}: Props) {
  const userAge = useMemo(() => calculateAge(target.birthDate), [target.birthDate]);

  const firstScreen: AnamneseScreenName =
    userAge >= 16 ? "StepDailyActivities" : "StepMedicalHistory";

  const [stack, setStack] = useState<AnamneseScreenName[]>([firstScreen]);
  const [resetKey] = useState(0);

  const navigate = useCallback((screen: AnamneseScreenName) => {
    setStack((prev) => [...prev, screen]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const Screen = SCREENS[stack[stack.length - 1]];

  return (
    <AnamneseTargetCtx.Provider value={{ current: target, index, total }}>
      <AnamneseNavCtx.Provider value={{ navigate, goBack }}>
        <AnamneseProvider key={resetKey} userAge={userAge}>
          <Screen onSubmitted={onSubmitted} />
        </AnamneseProvider>
      </AnamneseNavCtx.Provider>
    </AnamneseTargetCtx.Provider>
  );
}
