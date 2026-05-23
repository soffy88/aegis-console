"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { aegisFetch } from "@/lib/api";

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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data, isLoading } = useQuery<StoreResponse>({
    queryKey: ["store-apps", search, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      params.set("per_page", "60");
      return aegisFetch<StoreResponse>(`/api/v1/store/apps?${params}`);
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">App Store</h1>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search apps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border px-3 py-1.5 text-sm flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          <option value="Database">Database</option>
          <option value="Web">Web</option>
          <option value="Monitoring">Monitoring</option>
          <option value="Media">Media</option>
          <option value="Development">Development</option>
          <option value="Networking">Networking</option>
        </select>
      </div>
      {isLoading && <p>Loading…</p>}
      <p className="text-sm text-muted-foreground">{data?.total ?? 0} apps available</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.items.map((app) => (
          <div key={app.slug} className="rounded-lg border p-3 space-y-2 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{app.icon}</span>
              <div>
                <p className="font-medium text-sm">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.category}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
            <Link
              href={`/apps/install?from=store&slug=${app.slug}`}
              className="inline-block rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
            >
              Install
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
