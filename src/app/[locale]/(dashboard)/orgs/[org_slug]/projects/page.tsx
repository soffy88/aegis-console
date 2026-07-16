"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OKPICard, OFormField, OTextInput } from "@helios/blocks";
import type { Project } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

const SLUG_RE = /^[a-z0-9-]+$/;

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: () => aegisFetch<Project[]>(paths.projects(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ display_name: "", slug: "", environment: "prod" });
  const [slugError, setSlugError] = useState<string | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: (payload: { slug: string; name: string; display_name: string; environment: string }) =>
      aegisFetch<Project>(paths.projects(orgId!), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects", orgId] });
      setShowCreate(false);
      setForm({ display_name: "", slug: "", environment: "prod" });
    },
  });

  function setField(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (key === "slug") setSlugError(undefined);
    };
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!SLUG_RE.test(form.slug)) {
      setSlugError(t("slugHint"));
      return;
    }
    createMutation.mutate({
      slug: form.slug,
      name: form.display_name,
      display_name: form.display_name,
      environment: form.environment || "prod",
    });
  }

  if (error)
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
        Error: {(error as Error).message}
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showCreate ? tc("cancel") : t("add")}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="max-w-lg space-y-4 rounded border p-4">
          <OFormField label={tc("name")} htmlFor="display_name" required>
            <OTextInput id="display_name" value={form.display_name} onChange={setField("display_name")} placeholder="My Project" />
          </OFormField>
          <OFormField label={t("slug")} htmlFor="slug" required error={slugError} help={t("slugHint")}>
            <OTextInput id="slug" value={form.slug} onChange={setField("slug")} placeholder="my-project" />
          </OFormField>
          <OFormField label={t("environment")} htmlFor="environment">
            <OTextInput id="environment" value={form.environment} onChange={setField("environment")} placeholder="prod" />
          </OFormField>
          {createMutation.isError && (
            <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending || !orgId}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? t("creating") : tc("create")}
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statTotal")}</p>
          <p className="mt-1 text-2xl font-bold">{data?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statProd")}</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">
            {data?.filter((p) => p.environment === "prod").length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statOther")}</p>
          <p className="mt-1 text-2xl font-bold">
            {data?.filter((p) => p.environment !== "prod").length ?? 0}
          </p>
        </div>
      </div>

      {!isLoading && data?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] py-16 text-center">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <p className="text-sm text-[var(--muted-foreground)]">{t("noProjects")}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Link key={p.id} href={`/orgs/${org_slug}/projects/${p.slug}`}>
            <OKPICard
              data={{ label: p.display_name, primary: p.environment, indicator: "neutral" }}
              loading={isLoading}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
