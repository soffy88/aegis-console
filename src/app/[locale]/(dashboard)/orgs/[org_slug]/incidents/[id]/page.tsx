"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OJsonViewer } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface IncidentEvent {
  id: string;
  ts: string;
  event_type: string;
  severity: string;
  service: string | null;
  payload: unknown;
  trace_id: string | null;
}

interface IncidentDetail {
  id: string;
  title: string;
  severity: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  postmortem_md: string | null;
  events: IncidentEvent[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300",
  warning: "bg-yellow-500/15 text-yellow-300",
  info: "bg-blue-500/15 text-blue-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-orange-500/15 text-orange-300",
  resolved: "bg-green-500/15 text-green-300",
};

export default function IncidentDetailPage() {
  const t = useTranslations("incidents");
  const tc = useTranslations("common");
  const { org_slug, id } = useParams<{ org_slug: string; id: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<IncidentDetail>({
    queryKey: ["incidents", orgId, id],
    queryFn: () => aegisFetch<IncidentDetail>(paths.incident(orgId!, id)),
    enabled: !!orgId,
    refetchInterval: 15000,
  });

  const postmortem = useMutation({
    mutationFn: () =>
      aegisFetch<{ incident_id: string; postmortem_md: string }>(
        paths.incidentPostmortem(orgId!, id),
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incidents", orgId, id] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">{tc("loading")}</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("started", { time: new Date(data.started_at).toLocaleString() })}
            {data.resolved_at && ` · ${t("resolved", { time: new Date(data.resolved_at).toLocaleString() })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[data.severity] ?? "bg-[var(--muted)] text-[var(--card-foreground)]"}`}>
            {data.severity}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[data.status] ?? "bg-[var(--muted)] text-[var(--card-foreground)]"}`}>
            {data.status}
          </span>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{t("postmortem")}</h2>
          <button
            onClick={() => postmortem.mutate()}
            disabled={postmortem.isPending}
            className="rounded bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {postmortem.isPending
              ? t("generating")
              : data.postmortem_md
              ? t("regenerate")
              : t("generate")}
          </button>
        </div>
        {postmortem.isError && (
          <p className="text-destructive text-sm mb-2">
            {(postmortem.error as Error).message}
          </p>
        )}
        {data.postmortem_md ? (
          <pre className="rounded border bg-muted p-4 text-sm whitespace-pre-wrap font-mono overflow-auto max-h-96">
            {data.postmortem_md}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("noPostmortem")}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          {t("relatedEvents", { n: data.events.length })}
        </h2>
        {data.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          <div className="space-y-2">
            {data.events.map((ev) => (
              <div key={ev.id} className="rounded border p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{ev.event_type}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[ev.severity] ?? "bg-[var(--muted)] text-[var(--card-foreground)]"}`}>
                    {ev.severity}
                  </span>
                  {ev.service && (
                    <span className="text-xs text-muted-foreground">{ev.service}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(ev.ts).toLocaleString()}
                  </span>
                </div>
                {ev.payload != null && (
                  <OJsonViewer data={ev.payload as Record<string, unknown>} defaultExpandDepth={1} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
