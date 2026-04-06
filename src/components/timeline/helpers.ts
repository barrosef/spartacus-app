/**
 * Shared helper functions for timeline components.
 */

const AVATAR_PALETTE = [
  "#E57373", // red
  "#F06292", // pink
  "#BA68C8", // purple
  "#9575CD", // deep purple
  "#7986CB", // indigo
  "#64B5F6", // blue
  "#4FC3F7", // light blue
  "#4DD0E1", // cyan
  "#4DB6AC", // teal
  "#81C784", // green
  "#AED581", // light green
  "#FFD54F", // amber
  "#FFB74D", // orange
  "#FF8A65", // deep orange
] as const;

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor",
  instructor: "Instrutor",
  guardian: "Responsavel",
  supporter: "Apoiador",
  sponsor: "Patrocinador",
  owner: "Controlador",
  assistant: "Assistente",
};

/**
 * Extracts up to 2-character initials from a name.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Deterministic color for an avatar based on a name string.
 * Hashes the name and picks a color from the palette.
 */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/**
 * Translates an array of role codes to a comma-separated Portuguese string.
 */
export function formatRoles(roles: string[]): string {
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
}

/**
 * Returns a single role label in Portuguese.
 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
