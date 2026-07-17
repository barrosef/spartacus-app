/**
 * Sinal one-shot: o RootNavigator descarta a mídia recebida enquanto o usuário
 * está na tela de login (não seguramos mídia atravessando a autenticação — v1)
 * e marca aqui; o MainNavigator consome ao montar para exibir um aviso único.
 * Module-level porque os dois vivem em ramos diferentes da árvore e o sinal é
 * um one-shot transitório (não justifica um contexto próprio).
 */
let sharedWhileLoggedOut = false;

export function markSharedWhileLoggedOut(): void {
  sharedWhileLoggedOut = true;
}

export function consumeSharedWhileLoggedOut(): boolean {
  const v = sharedWhileLoggedOut;
  sharedWhileLoggedOut = false;
  return v;
}
