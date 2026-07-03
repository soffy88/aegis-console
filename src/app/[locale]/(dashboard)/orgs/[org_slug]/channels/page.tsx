"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type Ch = { id: string; name: string; kind: string; enabled: boolean };
export default function ChannelsPage() {
  const t = useTranslations("channels");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("slack");
  const [url, setUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const q = useQuery<Ch[]>({ queryKey: ["channels", orgId], queryFn: () => aegisFetch(paths.channels(orgId!)), enabled: !!orgId });
  const createM = useMutation({
    mutationFn: () => aegisFetch(paths.channels(orgId!), { method: "POST", body: JSON.stringify({ name, kind, config: kind === "telegram" ? { bot_token: botToken, chat_id: chatId } : { url } }) }),
    onSuccess: () => { setName(""); setUrl(""); setBotToken(""); setChatId(""); setMsg(null); qc.invalidateQueries({ queryKey: ["channels", orgId] }); },
    onError: (e: Error) => setMsg(e.message),
  });
  const testM = useMutation({ mutationFn: (id: string) => aegisFetch(paths.channelTest(orgId!, id), { method: "POST" }), onSuccess: () => setMsg("✓ sent"), onError: (e: Error) => setMsg("✗ " + e.message) });
  const delM = useMutation({ mutationFn: (id: string) => aegisFetch(paths.channel(orgId!, id), { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", orgId] }) });
  const inp = "rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} className={`${inp} w-36`} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inp}>
          {["slack", "discord", "telegram", "webhook"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        {kind === "telegram" ? (
          <>
            <input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="bot_token" className={`${inp} w-48`} />
            <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="chat_id" className={`${inp} w-32`} />
          </>
        ) : (
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="webhook url" className={`${inp} flex-1`} />
        )}
        <button disabled={!name || createM.isPending} onClick={() => createM.mutate()} className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50">{t("create")}</button>
      </div>
      {msg && <p className="font-mono text-xs text-[var(--muted-foreground)]">{msg}</p>}
      <table className="w-full text-sm"><tbody>{(q.data ?? []).map((c) => (
        <tr key={c.id} className="border-b border-[var(--border)]/40">
          <td className="p-2 font-medium">{c.name}</td>
          <td className="p-2"><span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs">{c.kind}</span></td>
          <td className="p-2 text-right">
            <button onClick={() => testM.mutate(c.id)} className="mr-2 text-xs text-[var(--primary)]">{t("test")}</button>
            <button onClick={() => delM.mutate(c.id)} className="text-xs text-red-400">✕</button>
          </td>
        </tr>))}</tbody></table>
    </div>
  );
}
