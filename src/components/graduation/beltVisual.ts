/** Visual helpers for belt ribbons — modality initials + tick contrast. */

const MODALITY_INITIALS: Record<string, string> = {
  "jiu-jitsu": "JIU",
  "muay-thai": "MUT",
  "capoeira": "CAP",
  "mma": "MMA",
};

/** Three-letter tag drawn on the ribbon (JIU/MUT/CAP/MMA, else first 3). */
export function getModalityInitials(modalityName: string): string {
  const key = (modalityName || "").trim().toLowerCase().replace(/\s+/g, "-");
  return MODALITY_INITIALS[key] ?? (modalityName || "").slice(0, 3).toUpperCase();
}

/** True when a belt color is light enough to need dark ticks/text on top. */
export function isLightColor(hex: string | null | undefined): boolean {
  if (!hex) return false;
  const m = hex.replace("#", "");
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  // relative luminance (sRGB approx)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.7;
}
