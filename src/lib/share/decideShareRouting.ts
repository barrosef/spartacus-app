export interface IncomingMedia {
  localUri: string;
  mimeType: string;
}

export interface ShareRoutingInput {
  /** O perfil ativo tem a role `social`? */
  hasSocialRole: boolean;
  /** Já existe algum wizard/modal/tela sobreposta aberta? */
  screenBusy: boolean;
  /** Imagens normalizadas recebidas pelo intent. */
  media: IncomingMedia[];
}

export type ShareAction =
  | "open"
  | "blocked-not-social"
  | "blocked-busy"
  | "truncated";

export interface ShareRoutingResult {
  action: ShareAction;
  /** Mídia a anexar (truncada em 5 quando action === "truncated" ou "open"). */
  media: IncomingMedia[];
}

const MAX_IMAGES = 5;

/**
 * Decide o que fazer com a mídia recebida via share-target, sem tocar em UI.
 * Ordem de precedência: não-social bloqueia; tela ocupada bloqueia; excesso
 * trunca (mas ainda abre com as 5 primeiras).
 */
export function decideShareRouting({
  hasSocialRole,
  screenBusy,
  media,
}: ShareRoutingInput): ShareRoutingResult {
  if (!hasSocialRole) {
    return { action: "blocked-not-social", media: [] };
  }
  if (screenBusy) {
    return { action: "blocked-busy", media: [] };
  }
  if (media.length > MAX_IMAGES) {
    return { action: "truncated", media: media.slice(0, MAX_IMAGES) };
  }
  return { action: "open", media };
}
