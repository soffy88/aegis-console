"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { OLoginPage } from "@helios/oui/pages";
import { login } from "@/lib/auth/client";
import { scheduleRefresh } from "@/lib/auth/auto-refresh";
import { loadUserOrgs, useOrgStore } from "@/lib/org-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const t = useTranslations("login");

  async function handleSubmit({
    email,
    password,
  }: {
    email: string;
    password: string;
    remember: boolean;
  }) {
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
        // Open-redirect guard: canonicalize via URL parser, then validate the
        // POST-PARSE result — not the raw or pre-cleaned input.
        //
        // Why two steps?
        //   1. strip \t\n\r  — browsers silently drop these, so "/\nevil.com"
        //      becomes "//evil.com" after strip; removing them first closes that gap.
        //   2. parse + assert origin — catches every scheme/authority the browser
        //      would recognize (data:, javascript:, //host, …).
        //   3. re-assert startsWith checks on `candidate` (the actual value we
        //      navigate to) — URL dot-segment normalisation can rewrite the path
        //      (e.g. "/.//..//evil.com" → "//evil.com"), so checking `cleaned`
        //      pre-parse is insufficient.
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
          } catch { /* invalid URL — fall through to defaultRedirect */ }
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

  // w-full max-w-sm: OLoginPage's .oui-auth-card is width:100% (oui ≥1.5.x), so
  // the wrapper MUST be width-constrained or the card collapses to a narrow
  // column (matches the Suspense fallback below).
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <OLoginPage
        title={t("title")}
        subtitle={t("subtitle")}
        onEmailLogin={handleSubmit}
        errorMessage={error ?? undefined}
        loading={loading}
      />
      <div className="text-center text-sm text-gray-500">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          {t("register")}
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
