"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, Event } from "@/lib/api";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { RefreshCw } from "lucide-react";

const HOURS_OPTIONS = [1, 6, 24, 72, 168];

export default function EventsPage() {
  const [hours, setHours] = useState(24);
  const [service, setService] = useState("");

  const { data: events = [], isLoading, refetch } = useQuery<Event[]>({
    queryKey: ["events", { hours, service }],
    queryFn: () =>
      api.events.list({ hours, limit: 200, service: service || undefined }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Events</h1>

        <div className="flex items-center gap-3">
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            placeholder="Filter by service…"
            value={service}
            onChange={(e) => setService(e.target.value)}
          />

          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`px-3 py-1.5 text-xs font-medium ${
                  hours === h
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {h < 24 ? `${h}h` : `${h / 24}d`}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-slate-400 text-sm">No events in the selected window.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="pb-3 font-medium w-40">Time</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Trace</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="py-2.5 text-slate-400 font-mono text-xs">
                    {new Date(ev.ts).toLocaleString()}
                  </td>
                  <td className="py-2.5 font-medium">{ev.event_type}</td>
                  <td className="py-2.5">
                    {ev.severity ? (
                      <StatusBadge status={ev.severity} />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {ev.trace_id ? (
                      <Link
                        href={`/incidents/${ev.trace_id}`}
                        className="font-mono text-xs text-indigo-400 hover:underline"
                      >
                        {ev.trace_id.slice(0, 12)}…
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
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
