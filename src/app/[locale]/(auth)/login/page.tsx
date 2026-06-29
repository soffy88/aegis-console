"use client";

// Simplified login: a plain email + password form. Deliberately does NOT use
// @helios/oui OLoginPage (its phone/wechat tabs aren't wired to a backend and
// its card had layout regressions across oui versions). This is the minimal
// thing that reliably works against POST /api/v1/auth/login.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
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
        const defaultRedirect = `/orgs/${orgs[0].slug}`;
        const rawNext = searchParams.get("next");
        // Open-redirect guard: strip control chars, parse, then validate the
        // post-parse origin/path (URL normalisation can rewrite "/.//..//x").
        let safe = defaultRedirect;
        if (rawNext) {
          const cleaned = rawNext.replace(/[\t\n\r]/g, "");
          try {
            const u = new URL(cleaned, window.location.origin);
            const candidate = u.pathname + u.search + u.hash;
            if (
              u.origin === window.location.origin &&
              candidate.startsWith("/") &&
              !candidate.startsWith("//")
            ) {
              safe = candidate;
            }
          } catch {
            /* invalid URL — fall through to defaultRedirect */
          }
        }
        router.replace(safe);
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
    <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-8 shadow-lg">
      <h1 className="mb-1 text-center text-2xl font-semibold text-white">Sign in to Aegis</h1>
      <p className="mb-6 text-center text-sm text-gray-400">Self-hosted PaaS management console</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          Email
          <input
            type="email"
            required
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-300">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-500">
        No account?{" "}
        <Link href="/register" className="text-blue-500 hover:underline">
          Register
        </Link>
      </div>
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
