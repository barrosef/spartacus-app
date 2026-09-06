import { createContext, useContext } from "react";

/** Retângulo na janela, em dp — o que `measureInWindow` devolve. */
export interface WindowRect {
  y: number;
  height: number;
}

export interface FeedScrollApi {
  /** Rola o feed `delta` px a partir da posição corrente. */
  scrollBy: (delta: number) => void;
  /**
   * Mede na janela a área visível do feed.
   *
   * Com o `adjustResize` do Android (padrão sob edge-to-edge) a raiz do RN
   * encolhe quando o teclado sobe, então esta altura JÁ exclui o teclado —
   * é por isso que ninguém aqui precisa saber a altura dele.
   */
  measureViewport: (cb: (rect: WindowRect) => void) => void;
}

/**
 * Deixa o campo de comentário pedir uma rolagem ao feed sem atravessar props
 * por TimelineCard e CommentsSection só para isso.
 *
 * Existe porque a seção de comentários é inline dentro do card: com o teclado
 * aberto, um campo que estava na metade de baixo da tela some atrás dele, e
 * quem sabe rolar é o ScrollView do feed.
 */
export const FeedScrollContext = createContext<FeedScrollApi | null>(null);

export function useFeedScroll() {
  return useContext(FeedScrollContext);
}
