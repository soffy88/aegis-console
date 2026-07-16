"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OStatusBadge } from "@helios/blocks";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

const TRANSITIONAL_STATUSES = ["installing", "pending", "building", "restarting"];

function Spinner() {
  return (
    <svg className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AppDetailPage() {
  const t = useTranslations("apps");
  const tc = useTranslations("common");
  const { org_slug, id } = useParams<{ org_slug: string; id: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data: app, isLoading, error } = useQuery<App>({
    queryKey: ["app", orgId, id],
    queryFn: () => aegisFetch<App>(paths.app(orgId!, id)),
    enabled: !!orgId,
    refetchInterval: (q) => (q.state.data && TRANSITIONAL_STATUSES.includes(q.state.data.status) ? 3000 : false),
  });

  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const backup = useMutation({
    mutationFn: (target: "s3" | "webdav") =>
      aegisFetch<{ target: string; size_bytes: number }>(
        `${paths.appBackup(orgId!, id)}?target=${target}`,
        { method: "POST" },
      ),
    onSuccess: (r) => setBackupMsg(`✓ ${r.target} (${(r.size_bytes / 1024).toFixed(1)} KB)`),
    onError: (e: Error) => setBackupMsg(`✗ ${e.message}`),
  });

  if (isLoading) return <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>;
  if (error) return <p className="text-destructive">{tc("error")}: {(error as Error).message}</p>;
  if (!app) return <p className="text-muted-foreground">{t("notFound")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{app.app_name}</h1>
        <OStatusBadge label={app.status} />
        <button
          onClick={() => {
            setBackupMsg(null);
            backup.mutate("s3");
          }}
          disabled={backup.isPending}
          className="ml-auto rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {backup.isPending && backup.variables === "s3" ? (
            <>
              <Spinner />
              {t("backingUp")}
            </>
          ) : (
            t("backupS3")
          )}
        </button>
        <button
          onClick={() => {
            setBackupMsg(null);
            backup.mutate("webdav");
          }}
          disabled={backup.isPending}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {backup.isPending && backup.variables === "webdav" ? (
            <>
              <Spinner />
              {t("backingUp")}
            </>
          ) : (
            t("backupWebdav")
          )}
        </button>
        <Link
          href={`/orgs/${org_slug}/apps/${id}/compose`}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--muted)]"
        >
          {t("editCompose")}
        </Link>
      </div>
      {backupMsg && <p className="font-mono text-xs text-[var(--muted-foreground)]">{backupMsg}</p>}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">{t("version")}</dt>
        <dd>{app.app_version ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("installDir")}</dt>
        <dd className="font-mono">{app.install_dir ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("domain")}</dt>
        <dd>{app.domain ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("installedAt")}</dt>
        <dd>{new Date(app.installed_at).toLocaleString()}</dd>
      </dl>
    </div>
  );
}
