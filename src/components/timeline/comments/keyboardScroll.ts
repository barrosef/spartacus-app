import { createContext, useContext } from "react";

/**
 * Deixa o campo de comentário pedir uma rolagem ao feed sem atravessar props
 * por TimelineCard e CommentsSection só para isso.
 *
 * Existe porque a seção de comentários é inline dentro do card: com o teclado
 * aberto, um campo que estava na metade de baixo da tela some atrás dele, e
 * quem sabe rolar é o ScrollView do feed.
 */
export const FeedScrollContext = createContext<((delta: number) => void) | null>(null);

export function useFeedScrollBy() {
  return useContext(FeedScrollContext);
}
