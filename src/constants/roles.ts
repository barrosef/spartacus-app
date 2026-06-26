export const STAFF_ROLES = new Set([
  "owner", "assistant", "teacher", "instructor",
]);

export function isStaffRoles(roles: string[]): boolean {
  return roles.some((r) => STAFF_ROLES.has(r));
}
