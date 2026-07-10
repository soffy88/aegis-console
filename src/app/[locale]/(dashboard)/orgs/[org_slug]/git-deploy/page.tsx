"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { Project } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

export default function GitDeployPage() {
  const t = useTranslations("gitDeploy");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [form, setForm] = useState({
    repo_url: "", app_name: "", branch: "", subdir: "", ports: "", project_id: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const projects = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: () => aegisFetch<Project[]>(paths.projects(orgId!)),
    enabled: !!orgId,
  });

  const deploy = useMutation({
    mutationFn: () => {
      const ports = form.ports
        .split(",")
        .map((p) => parseInt(p.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      const body = {
        repo_url: form.repo_url,
        app_name: form.app_name,
        branch: form.branch || null,
        subdir: form.subdir || null,
        ports,
      };
      return aegisFetch<{ install_id: string; status: string }>(
        paths.gitDeploy(orgId!, form.project_id),
        { method: "POST", body: JSON.stringify(body) },
      );
    },
    onSuccess: (r) => {
      setErr(null);
      setMsg(t("started", { id: r.install_id }));
    },
    onError: (e: Error) => {
      setMsg(null);
      setErr(e.message);
    },
  });

  const ready = form.repo_url && form.app_name && form.project_id;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {err && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{err}</p>}
      {msg && <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{msg}</p>}

      <div className="space-y-4 rounded-xl border bg-card p-5">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">{t("repoUrl")} *</span>
          <input value={form.repo_url} onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
            placeholder="https://github.com/user/repo.git"
            className="w-full rounded border bg-background px-3 py-2 font-mono text-sm" />
        </label>

        <div className="flex gap-4">
          <label className="block flex-1 space-y-1 text-sm">
            <span className="text-muted-foreground">{t("appName")} *</span>
            <input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              placeholder="my-app" className="w-full rounded border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block w-40 space-y-1 text-sm">
            <span className="text-muted-foreground">{t("branch")}</span>
            <input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
              placeholder="main" className="w-full rounded border bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="flex gap-4">
          <label className="block flex-1 space-y-1 text-sm">
            <span className="text-muted-foreground">{t("subdir")}</span>
            <input value={form.subdir} onChange={(e) => setForm({ ...form, subdir: e.target.value })}
              placeholder={t("subdirPlaceholder")} className="w-full rounded border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block w-40 space-y-1 text-sm">
            <span className="text-muted-foreground">{t("ports")}</span>
            <input value={form.ports} onChange={(e) => setForm({ ...form, ports: e.target.value })}
              placeholder="3000, 8080" className="w-full rounded border bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">{t("project")} *</span>
          <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            className="w-full rounded border bg-background px-3 py-2 text-sm">
            <option value="">{t("selectProject")}</option>
            {(projects.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.display_name ?? p.name}</option>
            ))}
          </select>
        </label>

        <button onClick={() => deploy.mutate()} disabled={!ready || deploy.isPending}
          className="rounded bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40">
          {deploy.isPending ? t("deploying") : t("deploy")}
        </button>
        <p className="text-xs text-muted-foreground">{t("portsHint")}</p>
      </div>
    </div>
  );
}
