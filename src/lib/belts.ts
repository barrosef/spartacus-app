/**
 * Belt (faixa) options per modality — shared by GraduationScreen (editing a
 * student's own graduation) and FrequencyHistoryScreen (attendance recorte
 * por graduação). Colors are the "official" belt colors used across the app
 * identity (mockups: docs/superpowers/specs/2026-07-18-frequencia-analitica-design.md).
 */

export interface BeltOption {
  label: string;
  color: string;
}

export const BELT_OPTIONS: Record<string, BeltOption[]> = {
  "Jiu-Jitsu": [
    { label: "Branca", color: "#FFFFFF" },
    { label: "Azul", color: "#2563EB" },
    { label: "Roxa", color: "#7C3AED" },
    { label: "Marrom", color: "#92400E" },
    { label: "Preta", color: "#222222" },
  ],
  "Muay Thai": [
    { label: "Branca", color: "#FFFFFF" },
    { label: "Amarela", color: "#EAB308" },
    { label: "Laranja", color: "#EA580C" },
    { label: "Verde", color: "#16A34A" },
    { label: "Azul", color: "#2563EB" },
    { label: "Roxa", color: "#7C3AED" },
    { label: "Marrom", color: "#92400E" },
    { label: "Vermelha", color: "#DC2626" },
    { label: "Preta", color: "#222222" },
  ],
  "Capoeira": [
    { label: "Crua", color: "#D4C5A9" },
    { label: "Amarela", color: "#EAB308" },
    { label: "Laranja", color: "#EA580C" },
    { label: "Azul", color: "#2563EB" },
    { label: "Verde", color: "#16A34A" },
    { label: "Roxa", color: "#7C3AED" },
    { label: "Marrom", color: "#92400E" },
    { label: "Vermelha", color: "#DC2626" },
    { label: "Branca", color: "#FFFFFF" },
  ],
};

/** Fallback belt list (Jiu-Jitsu) for modalities without a specific palette. */
export function getDefaultBelts(): BeltOption[] {
  return BELT_OPTIONS["Jiu-Jitsu"]!;
}

/** Neutral color for "no graduation" cards or unmatched belt labels. */
export const NO_GRADUATION_COLOR = "#6B7180";

/** Resolve the official color for a belt label within a modality. */
export function getBeltColor(
  modalityName: string | null | undefined,
  beltLabel: string | null | undefined,
): string {
  if (!beltLabel) return NO_GRADUATION_COLOR;
  const options = (modalityName && BELT_OPTIONS[modalityName]) || getDefaultBelts();
  const found = options.find((b) => b.label === beltLabel);
  return found?.color ?? NO_GRADUATION_COLOR;
}

/**
 * Normalize a modality/graduation map key (mirrors backend normalization —
 * `graduation_snapshot._normalize_key`): lowercase, spaces → hyphens.
 * Used to index `users/{uid}.graduation` (keyed by normalized modality name).
 */
export function normalizeModalityKey(name: string): string {
  return (name || "").trim().toLowerCase().replace(/\s+/g, "-");
}
