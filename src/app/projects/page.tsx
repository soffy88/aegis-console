"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OKPICard } from "@helios/blocks";
import type { Project } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

const STATUS_INDICATOR: Record<string, "up" | "neutral" | "down"> = {
  ok: "up",
  degraded: "neutral",
  down: "down",
};

export default function ProjectsPage() {
  const { data, isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => aegisFetch<Project[]>("/api/v1/projects"),
    refetchInterval: 30_000,
  });

  if (error) return <p className="p-4 text-red-600">Error: {(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Projects</h1>
      {!isLoading && data?.length === 0 && (
        <p className="text-muted-foreground">No projects discovered. Add aegis.project labels to your containers.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Link key={p.name} href={`/projects/${p.name}`}>
            <OKPICard
              data={{ label: p.name, primary: p.status, indicator: STATUS_INDICATOR[p.status] ?? "neutral" }}
              loading={isLoading}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
