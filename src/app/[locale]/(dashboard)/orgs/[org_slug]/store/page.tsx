"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface StoreApp {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  image: string;
}

interface StoreResponse {
  total: number;
  page: number;
  per_page: number;
  items: StoreApp[];
}

export default function StorePage() {
  const t = useTranslations("store");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data, isLoading } = useQuery<StoreResponse>({
    queryKey: ["store-apps", orgId, search, category],
    queryFn: () => {
      console.log("Fetching store apps with filter:", { search, category });
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      params.set("per_page", "60");
      return aegisFetch<StoreResponse>(`${paths.store(orgId!)}?${params}`);
    },
    enabled: !!orgId,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border px-3 py-1.5 text-sm flex-1"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border px-3 py-1.5 text-sm">
          <option value="">All categories</option>
          <option value="Automation">Automation</option>
          <option value="Backup">Backup</option>
          <option value="Cloud">Cloud</option>
          <option value="Continuousintegration">CI/CD</option>
          <option value="Dashboard">Dashboard</option>
          <option value="Database">Database</option>
          <option value="Development">Development</option>
          <option value="Dns">DNS</option>
          <option value="Docker">Docker</option>
          <option value="Downloaders">Downloader</option>
          <option value="Filesharing">File Sharing</option>
          <option value="Games">Games</option>
          <option value="Homeautomation">Home Automation</option>
          <option value="Management">Management</option>
          <option value="Media">Media</option>
          <option value="Messaging">Messaging</option>
          <option value="Monitoring">Monitoring</option>
          <option value="Network">Network</option>
          <option value="Productivity">Productivity</option>
          <option value="Security">Security</option>
          <option value="Social">Social</option>
          <option value="Storage">Storage</option>
          <option value="Streaming">Streaming</option>
          <option value="Tools">Tools</option>
          <option value="Video">Video</option>
          <option value="Web">Web</option>
        </select>
      </div>
      {isLoading && <p>Loading…</p>}
      <p className="text-sm text-muted-foreground">{data?.total ?? 0} apps available</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.items.map((app) => (
          <Link
            key={app.slug}
            href={`/orgs/${org_slug}/store/${app.slug}`}
            className="rounded-lg border p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer block"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{app.icon}</span>
              <div>
                <p className="font-medium text-sm">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.category}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
            <span className="inline-block rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              {t("details") || "Details"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
