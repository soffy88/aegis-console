"use client";

import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, LangProvider, OToastProvider, useToast } from "@helios/blocks";
import { makeQueryClient } from "@/lib/query-client";
import { initAuth } from "@/lib/auth/auto-refresh";
import { loadUserOrgs, useOrgStore } from "@/lib/org-context";
import { setToaster } from "@/lib/toast-bridge";

/** Registers the live toast dispatcher into the module-level bridge so the
 *  QueryClient's global onError handlers can surface toasts from outside React. */
function ToastBridge() {
  const { toast } = useToast();
  useEffect(() => {
    setToaster(toast);
    return () => setToaster(null);
  }, [toast]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  useEffect(() => {
    // On every app load: try to restore session from refresh cookie.
    // If initAuth returns false, the middleware will redirect to /login.
    void initAuth().then(async (ok) => {
      if (ok) await loadUserOrgs();
      useOrgStore.getState().setOrgsLoaded(true);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme="professional">
        <LangProvider lang="zh-en">
          <OToastProvider position="bottom-right">
            <ToastBridge />
            {children}
          </OToastProvider>
        </LangProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
