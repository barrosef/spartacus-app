import { useEffect, useState } from "react";
import { Dimensions, Keyboard } from "react-native";

/**
 * Distância entre o rodapé da tela e o topo do teclado (0 = teclado fechado).
 *
 * Existe porque o `adjustResize` não redimensiona a raiz do RN neste app:
 * medido em device (Android 15, edge-to-edge), a raiz fica em 800dp com o
 * teclado aberto e fechado. Por isso nada que dependa do layout se mexer
 * funciona aqui — mas os eventos de teclado do RN reportam certo:
 *
 *     altura 294 · screenY 458 · screen 800 · inset de baixo 48
 *     458 + 294 + 48 = 800  ✓
 *
 * `screenY` é o topo do teclado em coordenadas de tela, então a conta é
 * direta e não depende de saber se a altura reportada inclui a barra de
 * navegação. A soma acima serve de fallback caso algum device reporte
 * `screenY` relativo à janela em vez da tela.
 */
export function useKeyboardOffset(insetBottom = 0): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const screenH = Dimensions.get("screen").height;
      const fromScreenY = screenH - e.endCoordinates.screenY;
      const sane = fromScreenY > 0 && fromScreenY < screenH;
      setOffset(sane ? fromScreenY : e.endCoordinates.height + insetBottom);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setOffset(0));
    return () => { show.remove(); hide.remove(); };
  }, [insetBottom]);

  return offset;
}
