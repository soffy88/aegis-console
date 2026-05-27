"use client";

import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@helios/blocks";
import { makeQueryClient } from "@/lib/query-client";
import { initAuth } from "@/lib/auth/auto-refresh";
import { loadUserOrgs } from "@/lib/org-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  useEffect(() => {
    // On every app load: try to restore session from refresh cookie.
    // If initAuth returns false, the middleware will redirect to /login.
    void initAuth().then((ok) => {
      if (ok) void loadUserOrgs();
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme="professional">{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
