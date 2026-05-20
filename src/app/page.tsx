"use client";

import { useQuery } from "@tanstack/react-query";
import { api, InstalledApp, Domain, Event } from "@/lib/api";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { AppWindow, Globe, Activity, AlertCircle } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </Card>
  );
}

export default function OverviewPage() {
  const { data: apps = [] } = useQuery<InstalledApp[]>({
    queryKey: ["apps"],
    queryFn: api.apps.list,
  });
  const { data: domains = [] } = useQuery<Domain[]>({
    queryKey: ["domains"],
    queryFn: api.domains.list,
  });
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["events", { hours: 24, limit: 50 }],
    queryFn: () => api.events.list({ hours: 24, limit: 50 }),
  });

  const failed = apps.filter((a) => a.status === "failed").length;
  const running = apps.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Running apps"
          value={running}
          icon={AppWindow}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          label="Failed apps"
          value={failed}
          icon={AlertCircle}
          color="bg-red-500/20 text-red-400"
        />
        <StatCard
          label="Domains"
          value={domains.length}
          icon={Globe}
          color="bg-indigo-500/20 text-indigo-400"
        />
        <StatCard
          label="Events (24h)"
          value={events.length}
          icon={Activity}
          color="bg-slate-500/20 text-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Apps">
          {apps.length === 0 ? (
            <p className="text-slate-500 text-sm">No apps installed yet.</p>
          ) : (
            <ul className="space-y-2">
              {apps.slice(0, 5).map((app) => (
                <li
                  key={app.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm font-medium">{app.app_name}</span>
                  <StatusBadge status={app.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Events">
          {events.length === 0 ? (
            <p className="text-slate-500 text-sm">No events in the last 24h.</p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 5).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {ev.event_type}
                  </span>
                  {ev.severity && <StatusBadge status={ev.severity} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
