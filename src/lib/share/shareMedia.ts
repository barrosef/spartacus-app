import * as FileSystem from "expo-file-system";

interface ShareMediaInput {
  urls: string[];
  caption: string;
}

/**
 * Compartilha 1..N imagens remotas + legenda pela bandeja do Android.
 * Baixa cada URL para o cache (react-native-share exige arquivos locais),
 * chama Share.open e limpa os arquivos temporários no finally — inclusive
 * quando o download ou o Share.open falham. Só é chamada no Android
 * (gate canShareExternally no ponto de uso).
 *
 * - Cancelamento na bandeja: silencioso (failOnCancel: false → resolve).
 * - Falha de download / nenhum app receptor: rejeita (o chamador exibe diálogo).
 */
export async function shareMedia({ urls, caption }: ShareMediaInput): Promise<void> {
  // Lazy import: react-native-share is an Android-only native module; a
  // top-level import pulls it into the web bundle and crashes it at load. This
  // function only runs on Android (canShareExternally gate at the call site),
  // so load it on demand here.
  const Share = (await import("react-native-share")).default;
  const localUris: string[] = [];
  try {
    for (let i = 0; i < urls.length; i++) {
      const dest = `${FileSystem.cacheDirectory}spartacus-share-${i}.jpg`;
      const { uri } = await FileSystem.downloadAsync(urls[i], dest);
      localUris.push(uri);
    }
    await Share.open({
      urls: localUris,
      message: caption,
      failOnCancel: false,
    });
  } finally {
    await Promise.all(
      localUris.map((uri) =>
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}),
      ),
    );
  }
}
