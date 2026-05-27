"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/auth/client";
import { scheduleRefresh } from "@/lib/auth/auto-refresh";
import { loadUserOrgs, useOrgStore } from "@/lib/org-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      scheduleRefresh();

      const orgs = await loadUserOrgs();

      if (orgs.length > 0 && orgs[0]) {
        setActiveOrg(orgs[0].slug);
        const next = searchParams.get("next") ?? `/orgs/${orgs[0].slug}`;
        router.replace(next);
      } else {
        router.replace("/");
      }
    } catch (err) {
      setError((err as Error).message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Sign in to Aegis
      </h1>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm p-8">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
