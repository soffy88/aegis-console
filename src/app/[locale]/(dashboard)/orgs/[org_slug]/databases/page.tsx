"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Instance = { name: string; engine: string; image: string; manageable: boolean };

export default function DatabasesPage() {
  const t = useTranslations("databases");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [newDb, setNewDb] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const instances = useQuery<Instance[]>({
    queryKey: ["dbInstances", orgId],
    queryFn: () => aegisFetch<Instance[]>(paths.dbInstances(orgId!)),
    enabled: !!orgId,
  });

  const dbs = useQuery<string[]>({
    queryKey: ["dbList", orgId, open],
    queryFn: () => aegisFetch<string[]>(paths.dbList(orgId!, open!)),
    enabled: !!orgId && !!open,
  });

  const createM = useMutation({
    mutationFn: (name: string) =>
      aegisFetch(paths.dbList(orgId!, open!), { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setNewDb("");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["dbList", orgId, open] });
    },
    onError: (e: Error) => setErr(e.message),
  });
  const dropM = useMutation({
    mutationFn: (db: string) => aegisFetch(paths.dbDrop(orgId!, open!, db), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dbList", orgId, open] }),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>

      {instances.isLoading && (
        <p className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          {t("loading")}
        </p>
      )}

      {instances.error && (
        <p className="rounded-md border border-[var(--border)] p-4 text-sm text-destructive">
          {instances.error instanceof Error ? instances.error.message : t("loadFailed")}
        </p>
      )}

      {instances.data && instances.data.length === 0 && (
        <p className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          {t("empty")}
        </p>
      )}

      <div className="space-y-2">
        {(instances.data ?? []).map((inst) => (
          <div key={inst.name} className="rounded-md border border-[var(--border)]">
            <button
              onClick={() => {
                setErr(null);
                setOpen(open === inst.name ? null : inst.name);
              }}
              className="flex w-full items-center justify-between p-3 text-left hover:bg-[var(--muted)]"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{inst.name}</span>
                <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs uppercase">{inst.engine}</span>
                {!inst.manageable && (
                  <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-500">
                    {t("noCreds")}
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">{open === inst.name ? "▲" : "▼"}</span>
            </button>

            {open === inst.name && (
              <div className="space-y-3 border-t border-[var(--border)] p-3">
                <div className="flex gap-2">
                  <input
                    value={newDb}
                    onChange={(e) => setNewDb(e.target.value)}
                    placeholder={t("newDbName")}
                    className="flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-sm"
                  />
                  <button
                    disabled={!newDb || createM.isPending || !inst.manageable}
                    onClick={() => createM.mutate(newDb)}
                    className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
                  >
                    {t("create")}
                  </button>
                </div>
                {err && <p className="text-sm text-red-400">{err}</p>}
                <table className="w-full text-sm">
                  <tbody>
                    {dbs.isLoading && (
                      <tr>
                        <td className="p-2 text-[var(--muted-foreground)]">{t("loading")}</td>
                      </tr>
                    )}
                    {(dbs.data ?? []).map((db) => (
                      <tr key={db} className="border-b border-[var(--border)]/40">
                        <td className="p-2 font-mono text-xs">{db}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(t("dropConfirm", { db }))) dropM.mutate(db);
                            }}
                            className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            {t("drop")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
