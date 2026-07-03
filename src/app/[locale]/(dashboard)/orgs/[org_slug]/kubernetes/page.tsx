"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
export default function KubernetesPage() {
  const t = useTranslations("kubernetes");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [ns, setNs] = useState("default");
  const status = useQuery<{ configured: boolean; reachable?: boolean; version?: string }>({ queryKey: ["k8sStatus", orgId], queryFn: () => aegisFetch(paths.k8sStatus(orgId!)), enabled: !!orgId });
  const on = !!status.data?.configured;
  const nodes = useQuery<{ name: string; ready: boolean; kubelet: string; os: string }[]>({ queryKey: ["k8sNodes", orgId], queryFn: () => aegisFetch(paths.k8sNodes(orgId!)), enabled: on });
  const namespaces = useQuery<string[]>({ queryKey: ["k8sNs", orgId], queryFn: () => aegisFetch(paths.k8sNamespaces(orgId!)), enabled: on });
  const pods = useQuery<{ name: string; phase: string; ready: string; restarts: number; node: string }[]>({ queryKey: ["k8sPods", orgId, ns], queryFn: () => aegisFetch(paths.k8sPods(orgId!, ns)), enabled: on });
  if (status.data && !on) return <div className="space-y-4"><h1 className="text-2xl font-bold">{t("title")}</h1><p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">{t("notConfigured")}</p></div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("title")} {status.data?.version && <span className="text-sm text-[var(--muted-foreground)]">{status.data.version}</span>}</h1>
      <div>
        <h2 className="mb-1 text-sm font-semibold">{t("nodes")}</h2>
        <table className="w-full text-sm"><tbody>{(nodes.data ?? []).map((n) => (
          <tr key={n.name} className="border-b border-[var(--border)]/40"><td className="p-2 font-medium">{n.name}</td>
          <td className="p-2"><span className={n.ready ? "text-green-400" : "text-red-400"}>{n.ready ? "Ready" : "NotReady"}</span></td>
          <td className="p-2 text-xs text-[var(--muted-foreground)]">{n.kubelet} · {n.os}</td></tr>))}</tbody></table>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t("pods")}</h2>
          <select value={ns} onChange={(e) => setNs(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs">
            {(namespaces.data ?? [ns]).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]"><th className="p-2">{t("pod")}</th><th className="p-2">{t("phase")}</th><th className="p-2">{t("ready")}</th><th className="p-2 text-right">{t("restarts")}</th><th className="p-2">{t("node")}</th></tr></thead>
          <tbody>{(pods.data ?? []).map((p) => (
            <tr key={p.name} className="border-b border-[var(--border)]/40">
              <td className="p-2 font-mono text-xs">{p.name}</td>
              <td className="p-2"><span className={p.phase === "Running" ? "text-green-400" : "text-yellow-500"}>{p.phase}</span></td>
              <td className="p-2 tabular-nums">{p.ready}</td>
              <td className={`p-2 text-right tabular-nums ${p.restarts > 5 ? "text-red-400" : ""}`}>{p.restarts}</td>
              <td className="p-2 text-xs text-[var(--muted-foreground)]">{p.node}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
