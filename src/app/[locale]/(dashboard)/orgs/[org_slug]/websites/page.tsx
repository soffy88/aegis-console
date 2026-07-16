"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Site = { name: string; container: string; status: string; ports: string; domain?: string | null };

export default function WebsitesPage() {
  const t = useTranslations("websites");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [rootDir, setRootDir] = useState("");
  const [domain, setDomain] = useState("");
  const [php, setPhp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const list = useQuery<Site[]>({
    queryKey: ["websites", orgId],
    queryFn: () => aegisFetch<Site[]>(paths.websites(orgId!)),
    enabled: !!orgId,
  });

  const createM = useMutation({
    mutationFn: () =>
      aegisFetch<{ port: number; domain_bound?: boolean; https?: string }>(paths.websites(orgId!), {
        method: "POST",
        body: JSON.stringify({ name, root_dir: rootDir, php, ...(domain ? { domain } : {}) }),
      }),
    onSuccess: (r) => {
      setMsg(
        `✓ ${name} → port ${r.port}` +
          (r.domain_bound ? ` · ${domain} bound` : "") +
          (r.https ? ` · ${r.https}` : ""),
      );
      setName("");
      setRootDir("");
      setDomain("");
      qc.invalidateQueries({ queryKey: ["websites", orgId] });
    },
    onError: (e: Error) => setMsg(`✗ ${e.message}`),
  });
  const delM = useMutation({
    mutationFn: (n: string) => aegisFetch(paths.website(orgId!, n), { method: "DELETE" }),
    onSuccess: () => { setMsg(null); qc.invalidateQueries({ queryKey: ["websites", orgId] }); },
    onError: (e: Error) => setMsg(`✗ ${e.message}`),
  });

  const inp = "rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] p-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("name")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-site" className={`${inp} w-36`} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("rootDir")}
          <input value={rootDir} onChange={(e) => setRootDir(e.target.value)} placeholder="/mnt/d/sites/my-site" className={`${inp} w-full`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("domain")}
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="site.example.com" className={`${inp} w-52`} />
        </label>
        <label className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <input type="checkbox" checked={php} onChange={(e) => setPhp(e.target.checked)} /> PHP
        </label>
        <button
          disabled={!name || !rootDir || createM.isPending}
          onClick={() => createM.mutate()}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {createM.isPending ? t("deploying") : t("deploy")}
        </button>
      </div>
      {msg && <p className="font-mono text-xs text-[var(--muted-foreground)]">{msg}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <th className="p-2">{t("name")}</th>
            <th className="p-2">{t("domain")}</th>
            <th className="p-2">{t("status")}</th>
            <th className="p-2">{t("ports")}</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {list.isLoading && (
            <tr>
              <td colSpan={5} className="p-2 text-xs text-[var(--muted-foreground)]">{tc("loading")}</td>
            </tr>
          )}
          {list.error && (
            <tr>
              <td colSpan={5} className="p-2 text-xs text-destructive">
                {list.error instanceof Error ? list.error.message : tc("failed")}
              </td>
            </tr>
          )}
          {!list.isLoading && !list.error && list.data?.length === 0 && (
            <tr>
              <td colSpan={5} className="p-2 text-xs text-[var(--muted-foreground)]">{t("empty")}</td>
            </tr>
          )}
          {(list.data ?? []).map((s) => (
            <tr key={s.container} className="border-b border-[var(--border)]/40">
              <td className="p-2 font-medium">{s.name}</td>
              <td className="p-2 font-mono text-xs">{s.domain ?? "—"}</td>
              <td className="p-2 text-xs">{s.status}</td>
              <td className="p-2 font-mono text-xs">{s.ports}</td>
              <td className="p-2 text-right">
                <button
                  onClick={() => window.confirm(t("removeConfirm", { name: s.name })) && delM.mutate(s.name)}
                  className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  {t("remove")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
