import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

/**
 * Avisa sobre nova versão publicada na loja, respeitando a faixa do usuário.
 *
 * Quem responde "existe atualização" é o próprio Play Store, que já sabe de
 * qual faixa aquele device instalou: testador do internal é avisado quando o
 * build sobe no internal; quem instalou da produção, só quando chegar lá. Por
 * isso não há segmentação nossa aqui — a Play não expõe a faixa por API, e
 * qualquer inferência do lado do servidor erraria.
 *
 * Fluxo `flexible`: o download acontece em segundo plano enquanto a pessoa
 * segue usando o app, e o módulo nativo chama `completeUpdate()` sozinho ao
 * terminar. O `immediate`, que trava a tela até atualizar, ficou de fora de
 * propósito — seria péssimo no meio de um check-in.
 *
 * Android only: a App Store não tem equivalente.
 */

// Sem isso, toda volta do background dispara uma consulta ao Play.
const THROTTLE_MS = 4 * 60 * 60 * 1000; // 4h

export function useAppUpdate() {
  const lastCheckRef = useRef(0);

  useEffect(() => {
    // __DEV__: em build de desenvolvimento o Play Core não responde (o app não
    // veio da loja), então a chamada só geraria ruído no log.
    if (Platform.OS !== "android" || __DEV__) return;

    let cancelled = false;

    async function check() {
      const now = Date.now();
      if (now - lastCheckRef.current < THROTTLE_MS) return;
      lastCheckRef.current = now;
      try {
        // Lazy import: módulo nativo: no bundle web ele não existe.
        const InAppUpdates = await import("expo-in-app-updates");
        if (cancelled) return;
        // false = flexible
        await InAppUpdates.checkAndStartUpdate(false);
      } catch {
        // Conveniência, não função crítica: se o Play não responder, silêncio.
      }
    }

    void check();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}
