"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OStatusBadge } from "@helios/blocks";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { isTransitionalStatus } from "@/lib/app-status";

export default function AppDetailPage() {
  const t = useTranslations("apps");
  const tc = useTranslations("common");
  const { org_slug, id } = useParams<{ org_slug: string; id: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data: app, isLoading, error } = useQuery<App>({
    queryKey: ["app", orgId, id],
    queryFn: () => aegisFetch<App>(paths.app(orgId!, id)),
    enabled: !!orgId,
    // Poll while the install/deploy is still settling.
    refetchInterval: (q) => (q.state.data && isTransitionalStatus(q.state.data.status) ? 3000 : false),
  });

  if (isLoading) return <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>;
  if (error) return <p className="text-destructive">{tc("error")}: {(error as Error).message}</p>;
  if (!app) return <p className="text-muted-foreground">App not found.</p>;

  const transitional = isTransitionalStatus(app.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{app.app_name}</h1>
        {transitional && (
          <svg className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        )}
        <OStatusBadge label={app.status} />
      </div>
      {transitional && <p className="text-sm text-[var(--muted-foreground)]">{t("transitionalHint")}</p>}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Version</dt>
        <dd>{app.app_version ?? "—"}</dd>
        <dt className="text-muted-foreground">Install Dir</dt>
        <dd className="font-mono">{app.install_dir ?? "—"}</dd>
        <dt className="text-muted-foreground">Domain</dt>
        <dd>{app.domain ?? "—"}</dd>
        <dt className="text-muted-foreground">Installed At</dt>
        <dd>{new Date(app.installed_at).toLocaleString()}</dd>
      </dl>
    </div>
  );
}
