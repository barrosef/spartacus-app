import React, { createContext, useContext, useState, useCallback } from "react";

interface ProxyState {
  /** UID of the dependent being proxied, or null if viewing own profile */
  actingAs: string | null;
  /** Display name of the proxied dependent */
  actingAsName: string | null;
  /** Switch to a dependent's context */
  switchTo: (uid: string, name: string) => void;
  /** Return to own profile */
  clearProxy: () => void;
}

const ProxyCtx = createContext<ProxyState>({
  actingAs: null,
  actingAsName: null,
  switchTo: () => {},
  clearProxy: () => {},
});

export function useProxy() {
  return useContext(ProxyCtx);
}

export function ProxyProvider({ children }: { children: React.ReactNode }) {
  const [actingAs, setActingAs] = useState<string | null>(null);
  const [actingAsName, setActingAsName] = useState<string | null>(null);

  const switchTo = useCallback((uid: string, name: string) => {
    setActingAs(uid);
    setActingAsName(name);
  }, []);

  const clearProxy = useCallback(() => {
    setActingAs(null);
    setActingAsName(null);
  }, []);

  return (
    <ProxyCtx.Provider value={{ actingAs, actingAsName, switchTo, clearProxy }}>
      {children}
    </ProxyCtx.Provider>
  );
}
