"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, Event } from "@/lib/api";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { RefreshCw } from "lucide-react";

interface Incident {
  trace_id: string;
  first_seen: string;
  last_seen: string;
  event_count: number;
  max_severity: string | null;
  event_type: string;
}

function groupByTrace(events: Event[]): Incident[] {
  const map = new Map<string, Incident>();
  for (const ev of events) {
    if (!ev.trace_id) continue;
    const existing = map.get(ev.trace_id);
    if (!existing) {
      map.set(ev.trace_id, {
        trace_id: ev.trace_id,
        first_seen: ev.ts,
        last_seen: ev.ts,
        event_count: 1,
        max_severity: ev.severity,
        event_type: ev.event_type,
      });
    } else {
      existing.event_count += 1;
      if (ev.ts < existing.first_seen) existing.first_seen = ev.ts;
      if (ev.ts > existing.last_seen) existing.last_seen = ev.ts;
      if (ev.severity === "critical" || existing.max_severity !== "critical") {
        existing.max_severity = ev.severity;
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
  );
}

export default function IncidentsPage() {
  const { data: events = [], isLoading, refetch } = useQuery<Event[]>({
    queryKey: ["events", { hours: 168, limit: 500 }],
    queryFn: () => api.events.list({ hours: 168, limit: 500 }),
  });

  const incidents = groupByTrace(events);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : incidents.length === 0 ? (
          <p className="text-slate-400 text-sm">No incidents in the last 7 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="pb-3 font-medium">Trace ID</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Events</th>
                <th className="pb-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.trace_id}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="py-2.5">
                    <Link
                      href={`/incidents/${inc.trace_id}`}
                      className="font-mono text-xs text-indigo-400 hover:underline"
                    >
                      {inc.trace_id.slice(0, 20)}…
                    </Link>
                  </td>
                  <td className="py-2.5 font-medium">{inc.event_type}</td>
                  <td className="py-2.5">
                    {inc.max_severity ? (
                      <StatusBadge status={inc.max_severity} />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-400">{inc.event_count}</td>
                  <td className="py-2.5 text-slate-400">
                    {new Date(inc.last_seen).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
