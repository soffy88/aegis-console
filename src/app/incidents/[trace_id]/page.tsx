"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, Event } from "@/lib/api";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, ChevronRight } from "lucide-react";

export default function IncidentPage() {
  const params = useParams();
  const traceId = params.trace_id as string;

  // We query events filtered by the first event matching this trace_id
  // then follow causal chain from that event.
  // For the incident view we query events list and filter client-side.
  const { data: allEvents = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["events", { hours: 168, limit: 200 }],
    queryFn: () => api.events.list({ hours: 168, limit: 200 }),
  });

  const rootEvent = allEvents.find((e) => e.trace_id === traceId);

  const { data: chain = [], isLoading: loadingChain } = useQuery<Event[]>({
    queryKey: ["causal-chain", rootEvent?.id],
    queryFn: () => api.events.causalChain(rootEvent!.id),
    enabled: !!rootEvent,
  });

  const isLoading = loadingEvents || (!!rootEvent && loadingChain);

  const displayEvents = chain.length > 0 ? chain : allEvents.filter((e) => e.trace_id === traceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Incident</h1>
          <p className="text-sm text-slate-400 font-mono">{traceId}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading causal chain…</p>
      ) : displayEvents.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-sm">
            No events found for trace{" "}
            <span className="font-mono">{traceId}</span>.
          </p>
        </Card>
      ) : (
        <Card title={`Causal chain (${displayEvents.length} events)`}>
          <ol className="space-y-3">
            {displayEvents.map((ev, idx) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-300">
                    {idx + 1}
                  </div>
                  {idx < displayEvents.length - 1 && (
                    <div className="flex-1 w-px bg-slate-700 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{ev.event_type}</span>
                    {ev.severity && <StatusBadge status={ev.severity} />}
                    {ev.omodul_kind && (
                      <span className="text-xs text-slate-500 font-mono">
                        omodul:{ev.omodul_kind}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(ev.ts).toLocaleString()}
                  </p>
                  {Object.keys(ev.payload).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 flex items-center gap-1">
                        <ChevronRight size={12} />
                        payload
                      </summary>
                      <pre className="mt-1 text-xs bg-slate-800 rounded p-2 overflow-x-auto text-slate-300">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
