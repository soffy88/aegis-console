"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { OStatusBadge } from "@helios/blocks";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

export default function AppDetailPage() {
  const { org_slug, id } = useParams<{ org_slug: string; id: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data: app, isLoading, error } = useQuery<App>({
    queryKey: ["app", orgId, id],
    queryFn: () => aegisFetch<App>(paths.app(orgId!, id)),
    enabled: !!orgId,
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-destructive">Error: {(error as Error).message}</p>;
  if (!app) return <p className="text-muted-foreground">App not found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{app.app_name}</h1>
        <OStatusBadge label={app.status} />
      </div>
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
