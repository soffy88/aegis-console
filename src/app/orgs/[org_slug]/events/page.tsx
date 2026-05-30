"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ODataTable, OJsonViewer, OEventTimeline } from "@helios/blocks";
import type { ODataTableData, TimelineEvent } from "@helios/blocks";
import type { Event, CausalChainNode } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ColDef<T> = ODataTableData<T>["columns"][number];

const columns: ColDef<Event>[] = [
  { accessorKey: "ts", header: "Time", cell: ({ row }) => new Date(row.original.ts).toLocaleString() },
  { accessorKey: "event_type", header: "Type" },
  { accessorKey: "severity", header: "Severity" },
  { accessorKey: "omodul_kind", header: "Source" },
  { accessorKey: "trace_id", header: "Trace ID" },
];

export default function EventsPage() {
  const { org_slug } = useParams<{ org_slug: string }>();
  const router = useRouter();
  const orgId = useOrgIdBySlug(org_slug);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = useQuery<Event[]>({
    queryKey: ["events", orgId],
    queryFn: () => aegisFetch<Event[]>(paths.events(orgId!)),
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
      <h1 className="text-2xl font-bold">Events</h1>

      <OEventTimeline
        events={timelineEvents}
        onEventClick={(e) => router.push(`/orgs/${org_slug}/events/${e.id}`)}
        emptyMessage="No events yet"
      />

      <ODataTable<Event>
        data={events.data ? { columns, rows: events.data } : null}
        loading={events.isLoading}
        error={events.error as Error | null}
        empty={events.data?.length === 0}
        sortable
        onRowClick={(row) => setSelectedId((prev) => (prev === row.id ? null : row.id))}
      />

      {selectedId && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Causal Chain — {selectedId}</h2>
          {chain.isLoading ? <p>Loading chain…</p> : chain.error ? (
            <p className="text-destructive">{(chain.error as Error).message}</p>
          ) : (
            <OJsonViewer data={chain.data ?? null} defaultExpandDepth={3} />
          )}
        </section>
      )}
    </div>
  );
}
