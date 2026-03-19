import React, { createContext, useContext, useReducer } from "react";

export type Role = "student" | "teacher" | "instructor" | "guardian" | "supporter" | "sponsor";

export interface ClassOption {
  id: string;
  name: string;
  modality: string;
  schedule: string;
  teacher?: string;
  ageRange?: { min: number; max: number };
}

export interface Dependent {
  id: string;        // temp client-side id
  name: string;
  birthDate: string;
  taxId?: string;
  classIds: string[];
}

export interface WizardState {
  // Step 0 — auth method
  authMethod: "email" | "google" | null;
  email: string;
  password: string;

  // Step 1 — personal data
  name: string;
  birthDate: string;
  taxId: string;

  // Step 2 — contact
  phone: string;
  whatsapp: string;

  // Step 3 — address
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;

  // Step 4 — roles
  roles: Role[];

  // Step 5 — dependents (if guardian)
  dependents: Dependent[];

  // Step 5 — own classes (if student/teacher/instructor)
  classIds: string[];
}

const initialState: WizardState = {
  authMethod: null,
  email: "",
  password: "",
  name: "",
  birthDate: "",
  taxId: "",
  phone: "",
  whatsapp: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  roles: [],
  dependents: [],
  classIds: [],
};

type WizardAction =
  | { type: "SET_AUTH_METHOD"; payload: WizardState["authMethod"] }
  | { type: "SET_CREDENTIALS"; payload: { email: string; password: string } }
  | { type: "SET_PERSONAL_DATA"; payload: Pick<WizardState, "name" | "birthDate"> }
  | { type: "SET_CONTACT"; payload: Pick<WizardState, "phone" | "whatsapp"> }
  | { type: "SET_ADDRESS"; payload: Pick<WizardState, "postalCode" | "street" | "number" | "complement" | "neighborhood" | "city" | "state"> }
  | { type: "SET_ROLES"; payload: Role[] }
  | { type: "ADD_DEPENDENT"; payload: Dependent }
  | { type: "UPDATE_DEPENDENT"; payload: Dependent }
  | { type: "REMOVE_DEPENDENT"; payload: string }
  | { type: "SET_CLASS_IDS"; payload: string[] }
  | { type: "RESET" };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_AUTH_METHOD":
      return { ...state, authMethod: action.payload };
    case "SET_CREDENTIALS":
      return { ...state, ...action.payload };
    case "SET_PERSONAL_DATA":
      return { ...state, ...action.payload };
    case "SET_CONTACT":
      return { ...state, ...action.payload };
    case "SET_ADDRESS":
      return { ...state, ...action.payload };
    case "SET_ROLES":
      return { ...state, roles: action.payload };
    case "ADD_DEPENDENT":
      return {
        ...state,
        dependents: [...state.dependents, action.payload],
      };
    case "UPDATE_DEPENDENT":
      return {
        ...state,
        dependents: state.dependents.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case "REMOVE_DEPENDENT":
      return {
        ...state,
        dependents: state.dependents.filter((d) => d.id !== action.payload),
      };
    case "SET_CLASS_IDS":
      return { ...state, classIds: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  // Derived helpers
  isGuardian: boolean;
  hasClassRole: boolean;  // student | teacher | instructor
  skipClasses: boolean;   // supporter/sponsor only
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const isGuardian = state.roles.includes("guardian");
  const hasClassRole = state.roles.some((r) =>
    ["student", "teacher", "instructor"].includes(r)
  );
  const skipClasses =
    state.roles.length > 0 &&
    state.roles.every((r) => ["supporter", "sponsor"].includes(r));

  return (
    <WizardContext.Provider value={{ state, dispatch, isGuardian, hasClassRole, skipClasses }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
