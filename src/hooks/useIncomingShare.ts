import { useCallback, useMemo } from "react";
import { useShareIntentContext } from "../lib/shareIntent";
import type { ShareIntentFile } from "../lib/shareIntent";
import { canShareExternally } from "../lib/share/platform";
import type { IncomingMedia } from "../lib/share/decideShareRouting";

/**
 * Normaliza o share-intent do Android para o app. Só entrega mídia quando:
 *  - a plataforma é Android (canShareExternally),
 *  - o intent trouxe arquivos de imagem,
 *  - `profileReady` é true (o profile já carregou — evita corrida com o boot).
 *
 * Lê o estado compartilhado do ShareIntentProvider (mesma instância usada pelo
 * RootNavigator). `clear()` reseta o intent para não reprocessar a mesma mídia.
 * Cobre cold e warm start (ambos tratados pelo expo-share-intent).
 */
export function useIncomingShare(
  profileReady: boolean,
): { pendingMedia: IncomingMedia[] | null; clear: () => void } {
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const clear = useCallback(() => {
    resetShareIntent();
  }, [resetShareIntent]);

  const pendingMedia = useMemo<IncomingMedia[] | null>(() => {
    if (!canShareExternally) return null;
    if (!profileReady) return null;
    if (!hasShareIntent) return null;
    const files: ShareIntentFile[] = shareIntent?.files ?? [];
    const media = files
      .filter((f) => f.mimeType.startsWith("image/"))
      .map((f) => ({
        localUri: f.path,
        mimeType: f.mimeType,
      }));
    return media.length > 0 ? media : null;
  }, [profileReady, hasShareIntent, shareIntent]);

  return { pendingMedia, clear };
}
