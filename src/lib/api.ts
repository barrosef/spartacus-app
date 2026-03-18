import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:8000";

export async function checkEmail(
  email: string,
  signal?: AbortSignal,
): Promise<{ available: boolean }> {
  const url = `${API_URL}/auth/check-email?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`check-email failed: ${res.status}`);
  return res.json();
}
