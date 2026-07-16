"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Svc = { service: string; calls: number; rpm: number; error_pct: number; p50_ms: number; p95_ms: number; p99_ms: number };
type Trace = { trace_id: string; root_service: string; root_name: string; error: boolean; duration_ms: number; at: string };
type Span = { span_id: string; parent_span_id: string | null; service: string; name: string; offset_ms: number; duration_ms: number; error: boolean };

export default function ApmPage() {
  const t = useTranslations("apm");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [svc, setSvc] = useState<string | null>(null);
  const [trace, setTrace] = useState<string | null>(null);

  const services = useQuery<Svc[]>({
    queryKey: ["apmServices", orgId],
    queryFn: () => aegisFetch<Svc[]>(paths.apmServices(orgId!, 1440)),
    enabled: !!orgId,
    refetchInterval: 20_000,
  });
  const traces = useQuery<Trace[]>({
    queryKey: ["apmTraces", orgId, svc],
    queryFn: () => aegisFetch<Trace[]>(paths.apmTraces(orgId!, svc ?? "", 1440)),
    enabled: !!orgId && !!svc,
  });
  const detail = useQuery<{ spans: Span[] }>({
    queryKey: ["apmTrace", orgId, trace],
    queryFn: () => aegisFetch(paths.apmTrace(orgId!, trace!)),
    enabled: !!orgId && !!trace,
  });

  const maxMs = Math.max(1, ...(detail.data?.spans ?? []).map((s) => s.offset_ms + s.duration_ms));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>

      {services.isError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-destructive">
          {(services.error as Error).message}
        </p>
      )}

      {services.data && services.data.length === 0 && (
        <p className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          {t("empty")}
        </p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <th className="p-2">{t("service")}</th>
            <th className="p-2 text-right">{t("rpm")}</th>
            <th className="p-2 text-right">{t("errorPct")}</th>
            <th className="p-2 text-right">p50</th>
            <th className="p-2 text-right">p95</th>
            <th className="p-2 text-right">p99</th>
          </tr>
        </thead>
        <tbody>
          {services.isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-[var(--border)]/40">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="p-2">
                    <span className="block h-4 animate-pulse rounded bg-[var(--muted)]" />
                  </td>
                ))}
              </tr>
            ))}
          {(services.data ?? []).map((s) => (
            <tr
              key={s.service}
              onClick={() => {
                setSvc(s.service);
                setTrace(null);
              }}
              className={`cursor-pointer border-b border-[var(--border)]/40 hover:bg-[var(--muted)] ${svc === s.service ? "bg-[var(--primary-subtle)]" : ""}`}
            >
              <td className="p-2 font-medium">{s.service}</td>
              <td className="p-2 text-right tabular-nums">{s.rpm}</td>
              <td className={`p-2 text-right tabular-nums ${s.error_pct > 1 ? "text-red-400" : ""}`}>{s.error_pct}%</td>
              <td className="p-2 text-right tabular-nums">{s.p50_ms}ms</td>
              <td className="p-2 text-right tabular-nums">{s.p95_ms}ms</td>
              <td className="p-2 text-right tabular-nums">{s.p99_ms}ms</td>
            </tr>
          ))}
        </tbody>
      </table>

      {svc && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-1 text-sm font-semibold">{t("recentTraces")}: {svc}</h2>
            {traces.isError && (
              <p className="mb-1 text-xs text-destructive">{(traces.error as Error).message}</p>
            )}
            <div className="max-h-[45vh] overflow-auto rounded-md border border-[var(--border)]">
              {(traces.data ?? []).map((tr) => (
                <button
                  key={tr.trace_id}
                  onClick={() => setTrace(tr.trace_id)}
                  className={`flex w-full items-center justify-between border-b border-[var(--border)]/40 px-3 py-1.5 text-left text-xs hover:bg-[var(--muted)] ${trace === tr.trace_id ? "bg-[var(--primary-subtle)]" : ""}`}
                >
                  <span className="truncate">{tr.root_name}</span>
                  <span className={`ml-2 tabular-nums ${tr.error ? "text-red-400" : "text-[var(--muted-foreground)]"}`}>{tr.duration_ms}ms{tr.error ? " ✗" : ""}</span>
                </button>
              ))}
            </div>
          </div>
          {trace && (
            <div>
              <h2 className="mb-1 text-sm font-semibold">{t("waterfall")}</h2>
              {detail.isError && (
                <p className="mb-1 text-xs text-destructive">{(detail.error as Error).message}</p>
              )}
              <div className="max-h-[45vh] space-y-1 overflow-auto rounded-md border border-[var(--border)] p-2">
                {(detail.data?.spans ?? []).map((s) => (
                  <div key={s.span_id} className="text-xs">
                    <div className="flex justify-between">
                      <span className="truncate">
                        <span className="text-[var(--primary)]">{s.service}</span> {s.name}
                      </span>
                      <span className="tabular-nums text-[var(--muted-foreground)]">{s.duration_ms}ms</span>
                    </div>
                    <div className="h-1.5 rounded bg-[var(--muted)]">
                      <div
                        className={`h-1.5 rounded ${s.error ? "bg-red-400" : "bg-[var(--primary)]"}`}
                        style={{ marginLeft: `${(s.offset_ms / maxMs) * 100}%`, width: `${Math.max(1, (s.duration_ms / maxMs) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
