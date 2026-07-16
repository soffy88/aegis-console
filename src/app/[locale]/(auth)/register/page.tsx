"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { register } from "@/lib/auth/client";
import { scheduleRefresh } from "@/lib/auth/auto-refresh";
import { useOrgStore } from "@/lib/org-context";

export default function RegisterPage() {
  const t = useTranslations("register");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const org_name = formData.get("org_name") as string;
    const org_slug = formData.get("org_slug") as string;

    setLoading(true);
    setError(null);

    try {
      const res = await register({ email, password, org_name, org_slug });
      scheduleRefresh();
      setActiveOrg(res.org_slug);
      router.replace(`/orgs/${res.org_slug}`);
    } catch (err) {
      setError((err as Error).message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md p-8 bg-[var(--card)] rounded-lg shadow-md border border-[var(--border)]">
      <h1 className="text-2xl font-bold mb-2 text-[var(--card-foreground)]">{t("title")}</h1>
      <p className="text-[var(--muted-foreground)] mb-6">{t("subtitle")}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded border border-red-100 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="block w-full px-3 py-2 border border-[var(--border)] bg-[var(--muted)] text-[var(--card-foreground)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="block w-full px-3 py-2 border border-[var(--border)] bg-[var(--muted)] text-[var(--card-foreground)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
            placeholder="••••••••••••"
          />
        </div>
        <div>
          <label htmlFor="org_name" className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
            {t("orgName")}
          </label>
          <input
            id="org_name"
            name="org_name"
            type="text"
            required
            className="block w-full px-3 py-2 border border-[var(--border)] bg-[var(--muted)] text-[var(--card-foreground)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
            placeholder="My Organization"
          />
        </div>
        <div>
          <label htmlFor="org_slug" className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
            {t("orgSlug")}
          </label>
          <input
            id="org_slug"
            name="org_slug"
            type="text"
            required
            pattern="^[a-z0-9\-]+$"
            className="block w-full px-3 py-2 border border-[var(--border)] bg-[var(--muted)] text-[var(--card-foreground)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
            placeholder="my-org"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[var(--primary-foreground)] bg-[var(--primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-50"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-[var(--primary)] hover:underline">
          {t("login")}
        </Link>
      </div>
    </div>
  );
}
