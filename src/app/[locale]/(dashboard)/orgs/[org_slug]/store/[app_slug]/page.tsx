"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import Link from "next/link";

interface AppDetail {
  slug: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  category: string;
  image: string;
  ports?: { container_port: number; protocol: string; label: string }[];
  env?: { key: string; default_value: string; description: string }[];
  mounts?: { target: string; volume_name?: string; host_path?: string }[];
}

export default function AppDetailPage() {
  const t = useTranslations("store");
  const tc = useTranslations("common");
  const { org_slug, app_slug } = useParams<{ org_slug: string; app_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data: app, isLoading, error } = useQuery<AppDetail>({
    queryKey: ["store-app", orgId, app_slug],
    queryFn: () => aegisFetch<AppDetail>(`${paths.store(orgId!)}/${app_slug}`),
    enabled: !!orgId && !!app_slug,
  });

  if (isLoading) return <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>;
  if (error) return <p className="text-destructive">{tc("error")}: {(error as Error).message}</p>;
  if (!app) return <p className="text-[var(--muted-foreground)]">{t("notFound")}</p>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start gap-6">
        <span className="text-6xl p-4 bg-muted rounded-2xl">{app.icon}</span>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{app.name}</h1>
          <p className="text-muted-foreground text-lg">{app.description}</p>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded text-sm font-medium">
              {app.category}
            </span>
            <span className="px-2 py-0.5 bg-[var(--muted)] text-[var(--card-foreground)] rounded text-sm font-medium">
              {app.version}
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold border-b pb-2">{t("technicalDetails")}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-[var(--muted-foreground)]">{t("dockerImage")}</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{app.image}</code>
              </div>
            </div>
          </section>

          {app.ports && app.ports.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold border-b pb-2">{t("ports")}</h2>
              <ul className="space-y-1">
                {app.ports.map((p, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-mono">{p.container_port}/{p.protocol}</span>
                    {p.label && <span className="ml-2 text-[var(--muted-foreground)]">- {p.label}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {app.env && app.env.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold border-b pb-2">{t("envVars")}</h2>
              <div className="space-y-3">
                {app.env.map((e, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-mono font-bold text-[var(--primary)]">{e.key}</p>
                    <p className="text-[var(--muted-foreground)] text-xs">{e.description || t("noDescription")}</p>
                    <p className="text-xs mt-1">Default: <code className="bg-[var(--muted)] px-1 rounded">{e.default_value}</code></p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {app.mounts && app.mounts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold border-b pb-2">{t("mounts")}</h2>
              <ul className="space-y-1">
                {app.mounts.map((m, i) => (
                  <li key={i} className="text-sm">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.target}</code>
                    <span className="ml-2 text-[var(--muted-foreground)]">
                      (via {m.volume_name ? `volume ${m.volume_name}` : `host ${m.host_path}`})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-6 border rounded-xl bg-card shadow-sm space-y-4 sticky top-6">
            <h3 className="font-bold">{t("readyToDeploy")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("deployHint")}
            </p>
            <Link
              href={`/orgs/${org_slug}/apps/install?from=store&slug=${app.slug}`}
              className="w-full flex justify-center py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
            >
              {t("install")}
            </Link>
            <Link
              href={`/orgs/${org_slug}/store`}
              className="w-full flex justify-center py-2.5 px-4 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              {t("backToStore")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
