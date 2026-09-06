import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * DIAGNÓSTICO TEMPORÁRIO — remover depois de decidido o mecanismo do teclado.
 *
 * Três tentativas de manter o campo de comentário acima do teclado falharam
 * porque todas inferiam a posição do teclado a partir do layout. Este painel
 * mostra os números crus para responder duas perguntas objetivas:
 *
 *   1. A raiz do RN encolhe quando o teclado abre? (o adjustResize funciona?)
 *      → compare "raiz" antes e depois. Se não mudar, medir layout é inútil.
 *
 *   2. O RN reporta a altura do teclado corretamente sob edge-to-edge?
 *      → "teclado" deve virar algo em torno de 250-350dp. Se ficar 0, nem
 *        posicionar por evento funciona, e só resta ler o inset do IME.
 *
 * Fica no topo da tela de propósito: é a única faixa que continua visível
 * com o teclado aberto.
 */
export function KeyboardDiagnostics() {
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);
  const [kbScreenY, setKbScreenY] = useState(0);
  const [events, setEvents] = useState(0);
  const [rootNow, setRootNow] = useState(0);
  const [rootClosed, setRootClosed] = useState(0);
  const [win, setWin] = useState(Dimensions.get("window").height);
  const [screen] = useState(Dimensions.get("screen").height);
  const kbOpen = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      kbOpen.current = true;
      setEvents((n) => n + 1);
      setKbHeight(Math.round(e.endCoordinates.height));
      setKbScreenY(Math.round(e.endCoordinates.screenY));
      setWin(Math.round(Dimensions.get("window").height));
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      kbOpen.current = false;
      setEvents((n) => n + 1);
      setWin(Math.round(Dimensions.get("window").height));
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // A altura da raiz é o teste do adjustResize: se ela cair quando o teclado
  // abre, o layout está sendo redimensionado; se não, não está.
  const onRootLayout = (h: number) => {
    const r = Math.round(h);
    setRootNow(r);
    if (!kbOpen.current) setRootClosed(r);
  };

  const shrink = rootClosed && rootNow ? rootClosed - rootNow : 0;

  return (
    <>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        onLayout={(e) => onRootLayout(e.nativeEvent.layout.height)}
      />
      <View style={[styles.panel, { top: insets.top }]} pointerEvents="none">
        <Text style={styles.title}>DIAGNÓSTICO TECLADO</Text>
        <Row k="teclado (altura)" v={`${kbHeight}`} bad={kbHeight === 0} />
        <Row k="teclado (screenY)" v={`${kbScreenY}`} />
        <Row k="eventos recebidos" v={`${events}`} bad={events === 0} />
        <Row k="raiz agora" v={`${rootNow}`} />
        <Row k="raiz s/ teclado" v={`${rootClosed}`} />
        <Row
          k="encolheu?"
          v={shrink > 0 ? `SIM (${shrink})` : "NAO"}
          bad={shrink <= 0}
        />
        <Row k="window / screen" v={`${Math.round(win)} / ${Math.round(screen)}`} />
        <Row k="insets t/b" v={`${Math.round(insets.top)} / ${Math.round(insets.bottom)}`} />
      </View>
    </>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.key}>{k}</Text>
      <Text style={[styles.val, bad && styles.valBad]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1,
    borderColor: "#C6A34E",
    borderRadius: 8,
    padding: 8,
  },
  title: { color: "#C6A34E", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  key: { color: "#9aa0b4", fontSize: 11 },
  val: { color: "#fff", fontSize: 11, fontWeight: "700" },
  valBad: { color: "#ff6b6b" },
});
