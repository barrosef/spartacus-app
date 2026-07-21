/** Wire types (camelCase) for the graduation roster — mirror backend models. */

export type GradStatus = "none" | "pending" | "approved" | "rejected";

export interface NextBelt {
  slug: string;
  name: string;
  color: string;
  maxDegree: number;
}

export interface GradCard {
  userId: string;
  name: string;
  nickname?: string | null;
  initials: string;
  age?: number | null;
  photoUrl?: string | null;
  isDependent: boolean;
  guardianUid?: string | null;
  guardianName?: string | null;
  modalitySlug: string;
  modalityName: string;
  belt?: string | null;
  beltName?: string | null;
  color?: string | null;
  degree: number;
  status: GradStatus;
  maxDegree: number;
  canAddDegree: boolean;
  nextBelt?: NextBelt | null;
  outOfBand: boolean;
  canUndo: boolean;
}

export interface RosterTurma {
  modalityName: string;
  className: string;
}

export interface RosterPerson {
  userId: string;
  displayName: string;
  name: string;
  initials: string;
  photoUrl?: string | null;
  age?: number | null;
  isDependent: boolean;
  guardianUid?: string | null;
  turmas: RosterTurma[];
  graduations: GradCard[];
}

export interface RosterFamily {
  guardian: RosterPerson;
  guardianIsStudent: boolean;
  dependents: RosterPerson[];
}

export interface RosterOut {
  families: RosterFamily[];
  pendingCount: number;
}

/** Action kinds surfaced per graduation state. */
export type GradAction = "approve" | "reject" | "degree" | "belt" | "undo";
