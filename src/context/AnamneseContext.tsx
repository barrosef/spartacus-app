import React, { createContext, useContext, useReducer } from "react";

type Frequency = "always" | "sometimes" | "never" | "";

export interface AnamneseState {
  // Section 2: Daily Activities (16+ only)
  weeklyWorkHours: string;
  workActivities: string[];
  workActivitiesNotes: string;

  // Section 3: Medical History
  lastMedicalExamDate: string;
  familyHeartDisease: string[];
  surgeries: string[];
  surgeriesOther: string;
  diagnosedConditions: string[];
  diagnosedConditionsOther: string;
  currentMedications: string;
  symptoms: Record<string, Frequency>;
  hasAllergies: boolean | null;
  allergiesDetails: string;
  hasRecentInjury: boolean | null;
  injuryDetails: string;
  hasExerciseRestriction: boolean | null;
  restrictionDetails: string;

  // Section 4: Health Behavior
  smokes: boolean | null;
  cigarettesPerDay: string;
  practicesPhysicalActivity: boolean | null;
  physicalActivityDescription: string;
  physicalActivityFrequency: string;
  physicalActivityDuration: string;

  // Section 5: Goals
  goals: string[];
  goalsOther: string;

  // Section 6: General Comments
  generalComments: string;
}

const INITIAL_SYMPTOMS: Record<string, Frequency> = {
  coughingBlood: "",
  abdominalPain: "",
  legPain: "",
  armPain: "",
  backNeckPain: "",
  chestPain: "",
  jointPain: "",
  shortnessOfBreath: "",
  feelingWeak: "",
  dizziness: "",
  heartPalpitation: "",
};

const INITIAL_STATE: AnamneseState = {
  weeklyWorkHours: "",
  workActivities: [],
  workActivitiesNotes: "",
  lastMedicalExamDate: "",
  familyHeartDisease: [],
  surgeries: [],
  surgeriesOther: "",
  diagnosedConditions: [],
  diagnosedConditionsOther: "",
  currentMedications: "",
  symptoms: { ...INITIAL_SYMPTOMS },
  hasAllergies: null,
  allergiesDetails: "",
  hasRecentInjury: null,
  injuryDetails: "",
  hasExerciseRestriction: null,
  restrictionDetails: "",
  smokes: null,
  cigarettesPerDay: "",
  practicesPhysicalActivity: null,
  physicalActivityDescription: "",
  physicalActivityFrequency: "",
  physicalActivityDuration: "",
  goals: [],
  goalsOther: "",
  generalComments: "",
};

type Action =
  | { type: "SET_DAILY_ACTIVITIES"; payload: Partial<AnamneseState> }
  | { type: "SET_MEDICAL_HISTORY"; payload: Partial<AnamneseState> }
  | { type: "SET_HEALTH_BEHAVIOR"; payload: Partial<AnamneseState> }
  | { type: "SET_GOALS"; payload: Partial<AnamneseState> }
  | { type: "SET_COMMENTS"; payload: Partial<AnamneseState> }
  | { type: "RESET" };

function reducer(state: AnamneseState, action: Action): AnamneseState {
  switch (action.type) {
    case "SET_DAILY_ACTIVITIES":
    case "SET_MEDICAL_HISTORY":
    case "SET_HEALTH_BEHAVIOR":
    case "SET_GOALS":
    case "SET_COMMENTS":
      return { ...state, ...action.payload };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

interface AnamneseContextValue {
  state: AnamneseState;
  dispatch: React.Dispatch<Action>;
  userAge: number;
}

const AnamneseCtx = createContext<AnamneseContextValue | null>(null);

export function AnamneseProvider({
  children,
  userAge,
}: {
  children: React.ReactNode;
  userAge: number;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  return (
    <AnamneseCtx.Provider value={{ state, dispatch, userAge }}>
      {children}
    </AnamneseCtx.Provider>
  );
}

export function useAnamnese(): AnamneseContextValue {
  const ctx = useContext(AnamneseCtx);
  if (!ctx) throw new Error("useAnamnese must be used within AnamneseProvider");
  return ctx;
}
