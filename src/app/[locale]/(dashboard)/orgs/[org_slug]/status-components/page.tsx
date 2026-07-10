"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type C = { id: string; name: string; status: string };
const STATES = ["operational", "degraded", "partial_outage", "major_outage", "maintenance"];
export default function StatusComponentsPage() {
  const t = useTranslations("statusComponents");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [st, setSt] = useState("operational");
  const [deleteTarget, setDeleteTarget] = useState<C | null>(null);
  const q = useQuery<{ overall: string; components: C[] }>({ queryKey: ["statusComponents", orgId], queryFn: () => aegisFetch(paths.statusComponents(orgId!)), enabled: !!orgId });
  const upM = useMutation({ mutationFn: (b: { name: string; status: string }) => aegisFetch(paths.statusComponents(orgId!), { method: "POST", body: JSON.stringify(b) }), onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["statusComponents", orgId] }); } });
  const delM = useMutation({ mutationFn: (id: string) => aegisFetch(paths.statusComponent(orgId!, id), { method: "DELETE" }), onSuccess: () => { setDeleteTarget(null); qc.invalidateQueries({ queryKey: ["statusComponents", orgId] }); } });
  const inp = "rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {q.data && <p className="text-sm">{t("overall")}: <b className={q.data.overall === "operational" ? "text-green-400" : "text-yellow-500"}>{q.data.overall}</b></p>}
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} className={`${inp} w-40`} />
        <select value={st} onChange={(e) => setSt(e.target.value)} className={inp}>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <button disabled={!name} onClick={() => upM.mutate({ name, status: st })} className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50">{t("save")}</button>
      </div>
      <table className="w-full text-sm"><tbody>{(q.data?.components ?? []).map((c) => (
        <tr key={c.id} className="border-b border-[var(--border)]/40">
          <td className="p-2 font-medium">{c.name}</td>
          <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs ${c.status === "operational" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-500"}`}>{c.status}</span></td>
          <td className="p-2 text-right"><button onClick={() => setDeleteTarget(c)} className="text-xs text-red-400">✕</button></td>
        </tr>))}</tbody></table>
      <OConfirmDialog
        open={deleteTarget !== null}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        danger
        confirmLabel={tc("delete")}
        onConfirm={() => { if (deleteTarget) delM.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
