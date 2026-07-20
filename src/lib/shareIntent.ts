// Native (Android/iOS) entry point for the share-intent integration.
// Metro resolves `shareIntent.web.tsx` on web instead (a no-op passthrough),
// because `expo-share-intent` is an Android-only native module that throws at
// import time on web (TurboModuleRegistry.getEnforcing). Import from
// "../lib/shareIntent" everywhere instead of "expo-share-intent" directly.
export { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
export type { ShareIntentFile } from "expo-share-intent";
