import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { collection, doc, getFirestore, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, firebaseApp } from "./firebase";

// How notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert virou deprecated no expo-notifications do SDK 54:
    // banner (alerta flutuante) e list (central de notificações) agora são
    // controlados separadamente.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const db = getFirestore(firebaseApp);

const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined;

/**
 * Requests notification permission, obtains the Expo push token,
 * and persists it under users/{uid}/push_tokens/{tokenId}.
 *
 * Returns null on web, on simulators, or if permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    // Web push not implemented yet
    return null;
  }

  if (!Device.isDevice) {
    console.log("[Push] Skipping: not a physical device");
    return null;
  }

  // Android: required notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Spartacus",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C6A34E",
    });
  }

  // Permission flow
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("[Push] Permission denied");
    return null;
  }

  // Obtain Expo push token (works with FCM under the hood)
  let tokenData;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    );
  } catch (e) {
    console.error("[Push] Failed to get token:", e);
    return null;
  }

  const token = tokenData.data;
  const user = auth.currentUser;
  if (!user || !token) return null;

  // Persist token in users/{uid}/push_tokens/{tokenIdHash}
  // Use the token itself as the doc id to make it idempotent
  const tokenId = token.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 100);
  try {
    const tokensCol = collection(db, "users", user.uid, "push_tokens");
    const tokenDoc = doc(tokensCol, tokenId);
    await setDoc(
      tokenDoc,
      {
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName ?? null,
        modelName: Device.modelName ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    console.log("[Push] Token registered:", tokenId);
  } catch (e) {
    console.error("[Push] Failed to persist token:", e);
  }

  return token;
}

/**
 * Sets up listeners for incoming notifications.
 * Returns a cleanup function.
 */
export function setupNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void,
): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("[Push] Received:", notification);
      onReceived?.(notification);
    },
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("[Push] User tapped:", response);
      onResponse?.(response);
    },
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
