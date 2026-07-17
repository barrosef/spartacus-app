import type { TimelineEntry } from "../../components/timeline/types";

const SIGNATURE = "Projeto Spartacus 🛡️ Brasnorte-MT";

/**
 * Legenda de crédito anexada às imagens compartilhadas.
 * Com título: "{título} — {assinatura}". Sem título: só a assinatura.
 */
export function buildCaption(entry: Pick<TimelineEntry, "title">): string {
  const title = entry.title?.trim();
  return title ? `${title} — ${SIGNATURE}` : SIGNATURE;
}
