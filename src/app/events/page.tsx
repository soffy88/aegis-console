"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ODataTable, OJsonViewer } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { Event, CausalChainNode } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

type ColDef<T> = ODataTableData<T>["columns"][number];

const columns: ColDef<Event>[] = [
  {
    accessorKey: "ts",
    header: "Time",
    cell: ({ row }) => new Date(row.original.ts).toLocaleString(),
  },
  { accessorKey: "event_type", header: "Type" },
  { accessorKey: "severity", header: "Severity" },
  { accessorKey: "omodul_kind", header: "Source" },
  { accessorKey: "trace_id", header: "Trace ID" },
];

export default function EventsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: () => aegisFetch<Event[]>("/api/v1/events"),
  });

  const chain = useQuery<CausalChainNode[]>({
    queryKey: ["events", selectedId, "causal-chain"],
    queryFn: () =>
      aegisFetch<CausalChainNode[]>(
        `/api/v1/events/${selectedId}/causal-chain`,
      ),
    enabled: selectedId !== null,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Events</h1>

      <ODataTable<Event>
        data={events.data ? { columns, rows: events.data } : null}
        loading={events.isLoading}
        error={events.error as Error | null}
        empty={events.data?.length === 0}
        sortable
        onRowClick={(row) =>
          setSelectedId((prev) => (prev === row.id ? null : row.id))
        }
      />

      {selectedId && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">
            Causal Chain — {selectedId}
          </h2>
          {chain.isLoading ? (
            <p>Loading chain…</p>
          ) : chain.error ? (
            <p className="text-destructive">
              {(chain.error as Error).message}
            </p>
          ) : (
            <OJsonViewer data={chain.data ?? null} defaultExpandDepth={3} />
          )}
        </section>
      )}
    </div>
  );
}
