/**
 * Converts an ISO date string to a Portuguese relative time string.
 * E.g. "há 5 minutos", "há 2 horas", "ontem", "há 3 dias".
 */
export function timeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "agora";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "agora";
  if (minutes === 1) return "há 1 minuto";
  if (minutes < 60) return `há ${minutes} minutos`;
  if (hours === 1) return "há 1 hora";
  if (hours < 24) return `há ${hours} horas`;
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  if (weeks === 1) return "há 1 semana";
  if (weeks < 5) return `há ${weeks} semanas`;
  if (months === 1) return "há 1 mês";
  if (months < 12) return `há ${months} meses`;

  const years = Math.floor(months / 12);
  if (years === 1) return "há 1 ano";
  return `há ${years} anos`;
}
