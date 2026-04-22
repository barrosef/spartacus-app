import { auth } from "./firebase";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// Default project ID — can be overridden at runtime via setProjectId()
let _projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "spartacus-artes-marciais";

export function setProjectId(id: string) { _projectId = id; }
export function getProjectId() { return _projectId; }

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Project-Id": _projectId,
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let message = `Erro ${res.status}`;
    if (Array.isArray(body.detail)) {
      message = body.detail.map((e: { msg?: string }) => e.msg ?? "").filter(Boolean).join("; ");
    } else if (typeof body.detail === "string") {
      message = body.detail;
    }
    throw new ApiError(message, res.status, body);
  }

  // 204 No Content / empty body → don't try to parse JSON. Callers that
  // type this as <void> won't use the return value anyway; callers typing
  // a concrete shape shouldn't be calling endpoints that return 204.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export const api = {
  get: <T>(
    path: string,
    signalOrOptions?: AbortSignal | RequestOptions,
  ) => {
    if (signalOrOptions instanceof AbortSignal) {
      return request<T>(path, { signal: signalOrOptions });
    }
    return request<T>(path, {
      signal: signalOrOptions?.signal,
      headers: signalOrOptions?.headers,
    });
  },

  post: <T>(path: string, data: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(data),
      headers: options?.headers,
    }),

  patch: <T>(path: string, data: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: options?.headers,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, {
      method: "DELETE",
      headers: options?.headers,
    }),

  upload: async <T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      "X-Project-Id": _projectId,
      ...(options?.headers ?? {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
      signal: options?.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      let message = `Erro ${res.status}`;
      if (typeof body.detail === "string") message = body.detail;
      throw new ApiError(message, res.status, body);
    }
    return res.json() as Promise<T>;
  },
};

export async function checkEmail(
  email: string,
  signal?: AbortSignal,
): Promise<{ available: boolean }> {
  const url = `${BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`check-email failed: ${res.status}`);
  return res.json();
}
