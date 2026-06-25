import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../lib/api";
import { auth } from "../lib/firebase";
import { useProxy } from "../context/ProxyContext";

export type AnamneseStatus =
  | "not_started"
  | "pending_approval"
  | "approved"
  | "needs_revision";

interface MedicalHistoryResponse {
  status: AnamneseStatus;
}

interface UseAnamneseStatusResult {
  status: AnamneseStatus | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Fetches GET /medical-history/{uid} for the current user (or actingAs uid).
 * 404 → "not_started". Other errors leave status as null.
 */
export function useAnamneseStatus(): UseAnamneseStatusResult {
  const { actingAs } = useProxy();
  const currentUid = auth.currentUser?.uid ?? "";
  const targetUid = actingAs ?? currentUid;

  const [status, setStatus] = useState<AnamneseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!targetUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<MedicalHistoryResponse>(
        `/medical-history/${targetUid}`,
        { headers },
      );
      setStatus(data.status);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("not_started");
      } else {
        // Network/auth error — leave status null, banner stays hidden
        setStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }, [actingAs, targetUid]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
