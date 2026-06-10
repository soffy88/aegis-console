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
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold mb-2 text-gray-900">{t("title")}</h1>
      <p className="text-gray-500 mb-6">{t("subtitle")}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded border border-red-100 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("email")}
          </label>
          <input
            name="email"
            type="email"
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("password")}
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={12}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="••••••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("orgName")}
          </label>
          <input
            name="org_name"
            type="text"
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="My Organization"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("orgSlug")}
          </label>
          <input
            name="org_slug"
            type="text"
            required
            pattern="^[a-z0-9-]+$"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="my-org"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? t("submitting") || "..." : t("submit")}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          {t("login")}
        </Link>
      </div>
    </div>
  );
}
