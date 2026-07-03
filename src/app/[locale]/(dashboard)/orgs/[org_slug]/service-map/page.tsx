"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Topo = { nodes: string[]; edges: { src: string; dst: string; calls: number; error_pct: number }[] };
type Rca = { impacted: string; likely_root: string | null; candidates: { service: string; depth: number; error_pct: number; score: number }[] };

export default function ServiceMapPage() {
  const t = useTranslations("serviceMap");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const q = useQuery<Topo>({
    queryKey: ["apmTopology", orgId],
    queryFn: () => aegisFetch<Topo>(paths.apmTopology(orgId!, 1440)),
    enabled: !!orgId,
    refetchInterval: 20_000,
  });
  const [rcaSvc, setRcaSvc] = useState("");
  const [rcaQ, setRcaQ] = useState("");
  const rca = useQuery<Rca>({
    queryKey: ["rca", orgId, rcaQ],
    queryFn: () => aegisFetch<Rca>(paths.rca(orgId!, rcaQ, 1440)),
    enabled: !!orgId && !!rcaQ,
  });

  const nodes = q.data?.nodes ?? [];
  const W = 800;
  const H = 480;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 80;
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const a = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    pos.set(n, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>

      <div className="rounded-md border border-[var(--border)] p-3">
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
            {t("rcaLabel")}
            <input
              value={rcaSvc}
              onChange={(e) => setRcaSvc(e.target.value)}
              placeholder="frontend"
              list="svc-list"
              className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm"
            />
            <datalist id="svc-list">{nodes.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <button
            onClick={() => setRcaQ(rcaSvc)}
            disabled={!rcaSvc}
            className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {t("rcaRun")}
          </button>
          {rca.data?.likely_root && (
            <span className="text-sm">
              {t("likelyRoot")}: <b className="text-red-400">{rca.data.likely_root}</b>
            </span>
          )}
        </div>
        {rca.data && rca.data.candidates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {rca.data.candidates.map((c) => (
              <span key={c.service} className="rounded border border-[var(--border)] px-2 py-1">
                {c.service} · {t("depth")} {c.depth} · {c.error_pct}% · {t("score")} {c.score}
              </span>
            ))}
          </div>
        )}
        {rca.data && rca.data.candidates.length === 0 && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">{t("rcaNone")}</p>
        )}
      </div>
      {nodes.length === 0 ? (
        <p className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--card)]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: "70vh" }}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 Z" fill="var(--muted-foreground)" />
              </marker>
            </defs>
            {(q.data?.edges ?? []).map((e, i) => {
              const a = pos.get(e.src);
              const b = pos.get(e.dst);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--muted-foreground)" strokeWidth={1 + Math.log2(1 + e.calls)} markerEnd="url(#arrow)" opacity={0.5} />
                  <text x={mx} y={my - 4} textAnchor="middle" fontSize="10" fill={e.error_pct > 1 ? "#f87171" : "var(--muted-foreground)"}>
                    {e.calls}× {e.error_pct > 0 ? `${e.error_pct}%` : ""}
                  </text>
                </g>
              );
            })}
            {nodes.map((n) => {
              const p = pos.get(n)!;
              return (
                <g key={n}>
                  <circle cx={p.x} cy={p.y} r={26} fill="var(--primary-subtle)" stroke="var(--primary)" strokeWidth={1.5} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fill="var(--card-foreground)">
                    {n.length > 10 ? n.slice(0, 9) + "…" : n}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
