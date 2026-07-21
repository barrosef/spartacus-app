// Web passthrough for the share-intent integration. `expo-share-intent` is an
// Android-only native module and crashes the web bundle at import time
// (TurboModuleRegistry.getEnforcing on an unavailable native module). On web
// the share-target feature simply does not exist, so the provider renders its
// children unchanged and the hook reports "no shared media".
import React from "react";

export function ShareIntentProvider({
  children,
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  return <>{children}</>;
}

export function useShareIntentContext() {
  return {
    hasShareIntent: false,
    shareIntent: null as { files?: ShareIntentFile[] } | null,
    resetShareIntent: () => {},
  };
}

export type ShareIntentFile = {
  path: string;
  mimeType: string;
  fileName?: string;
};
