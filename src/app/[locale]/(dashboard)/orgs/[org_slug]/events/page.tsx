"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OJsonViewer, OEventTimeline } from "@helios/blocks";
import type { ODataTableData, TimelineEvent } from "@helios/blocks";
import type { Event, CausalChainNode } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function EventsPage() {
  const t = useTranslations("events");
  const { org_slug } = useParams<{ org_slug: string }>();
  const router = useRouter();
  const orgId = useOrgIdBySlug(org_slug);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const columns: ColDef<Event>[] = [
    { accessorKey: "ts", header: t("time"), cell: ({ row }) => new Date(row.original.ts).toLocaleString() },
    { accessorKey: "event_type", header: t("type") },
    { accessorKey: "severity", header: t("severity") },
    { accessorKey: "omodul_kind", header: t("source") },
    { accessorKey: "trace_id", header: t("traceId") },
  ];

  const events = useQuery<Event[]>({
    queryKey: ["events", orgId, offset],
    queryFn: () => aegisFetch<Event[]>(`${paths.events(orgId!)}?limit=${LIMIT}&offset=${offset}`),
    enabled: !!orgId,
  });

  const chain = useQuery<CausalChainNode[]>({
    queryKey: ["events", orgId, selectedId, "causal-chain"],
    queryFn: () => aegisFetch<CausalChainNode[]>(`${paths.event(orgId!, selectedId!)}/causal-chain`),
    enabled: !!orgId && selectedId !== null,
  });

  const timelineEvents: TimelineEvent[] = (events.data ?? []).map((e) => ({
    id: e.id,
    title: e.event_type,
    time: e.ts,
    subtitle: e.omodul_kind ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statRecent")}</p>
          <p className="mt-1 text-2xl font-bold">{events.data?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statCritical")}</p>
          <p className="mt-1 text-2xl font-bold text-red-400">
            {events.data?.filter((e) => e.severity === "critical" || e.severity === "error").length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statWarning")}</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {events.data?.filter((e) => e.severity === "warning").length ?? 0}
          </p>
        </div>
      </div>

      <OEventTimeline
        events={timelineEvents}
        onEventClick={(e) => router.push(`/orgs/${org_slug}/events/${e.id}`)}
        emptyMessage={t("empty")}
      />

      <ODataTable<Event>
        data={events.data ? { columns, rows: events.data } : null}
        loading={events.isLoading}
        error={events.error as Error | null}
        empty={events.data?.length === 0}
        sortable
        onRowClick={(row) => setSelectedId((prev) => (prev === row.id ? null : row.id))}
      />

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
          disabled={offset === 0}
          className="rounded border px-3 py-1 disabled:opacity-40"
        >
          ← {t("prev")}
        </button>
        <span className="text-muted-foreground">
          {offset + 1}–{offset + (events.data?.length ?? 0)}
        </span>
        <button
          onClick={() => setOffset((prev) => prev + LIMIT)}
          disabled={!events.data || events.data.length < LIMIT}
          className="rounded border px-3 py-1 disabled:opacity-40"
        >
          {t("next")} →
        </button>
      </div>

      {selectedId && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("causalChain")} — {selectedId}</h2>
          {chain.isLoading ? <p>{t("loadingChain")}</p> : chain.error ? (
            <p className="text-destructive">{(chain.error as Error).message}</p>
          ) : (
            <OJsonViewer data={chain.data ?? null} defaultExpandDepth={3} />
          )}
        </section>
      )}
    </div>
  );
}
