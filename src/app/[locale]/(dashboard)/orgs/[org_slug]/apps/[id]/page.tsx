"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-destructive">Error: {(error as Error).message}</p>;
  if (!app) return <p className="text-muted-foreground">App not found.</p>;

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
          {backup.isPending ? "Backing up…" : "Backup → S3"}
        </button>
        <button
          onClick={() => {
            setBackupMsg(null);
            backup.mutate("webdav");
          }}
          disabled={backup.isPending}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {"Backup → WebDAV"}
        </button>
        <Link
          href={`/orgs/${org_slug}/apps/${id}/compose`}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--muted)]"
        >
          Edit Compose
        </Link>
      </div>
      {backupMsg && <p className="font-mono text-xs text-[var(--muted-foreground)]">{backupMsg}</p>}
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
