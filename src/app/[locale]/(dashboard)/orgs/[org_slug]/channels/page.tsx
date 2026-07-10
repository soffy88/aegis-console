"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type Ch = { id: string; name: string; kind: string; enabled: boolean };
export default function ChannelsPage() {
  const t = useTranslations("channels");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("slack");
  const [url, setUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ch | null>(null);
  const q = useQuery<Ch[]>({ queryKey: ["channels", orgId], queryFn: () => aegisFetch(paths.channels(orgId!)), enabled: !!orgId });
  const createM = useMutation({
    mutationFn: () => aegisFetch(paths.channels(orgId!), { method: "POST", body: JSON.stringify({ name, kind, config: kind === "telegram" ? { bot_token: botToken, chat_id: chatId } : { url } }) }),
    onSuccess: () => { setName(""); setUrl(""); setBotToken(""); setChatId(""); setMsg(null); setFormError(null); qc.invalidateQueries({ queryKey: ["channels", orgId] }); },
    onError: (e: Error) => setMsg(e.message),
  });
  const testM = useMutation({ mutationFn: (id: string) => aegisFetch(paths.channelTest(orgId!, id), { method: "POST" }), onSuccess: () => setMsg("✓ sent"), onError: (e: Error) => setMsg("✗ " + e.message) });
  const delM = useMutation({ mutationFn: (id: string) => aegisFetch(paths.channel(orgId!, id), { method: "DELETE" }), onSuccess: () => { setDeleteTarget(null); qc.invalidateQueries({ queryKey: ["channels", orgId] }); } });
  const inp = "rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm";

  function isValidHttpUrl(v: string): boolean {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function submit() {
    // Kind-specific validation before firing the create mutation.
    if (kind === "telegram") {
      if (!botToken.trim()) return setFormError(t("botTokenRequired"));
      if (!chatId.trim()) return setFormError(t("chatIdRequired"));
    } else {
      if (!url.trim()) return setFormError(t("urlRequired"));
      if (!isValidHttpUrl(url.trim())) return setFormError(t("invalidUrl"));
    }
    setFormError(null);
    createM.mutate();
  }
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
            <input type="password" autoComplete="off" value={botToken} onChange={(e) => { setBotToken(e.target.value); setFormError(null); }} placeholder={t("botToken")} className={`${inp} w-48`} />
            <input value={chatId} onChange={(e) => { setChatId(e.target.value); setFormError(null); }} placeholder={t("chatId")} className={`${inp} w-32`} />
          </>
        ) : (
          <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setFormError(null); }} placeholder={t("webhookUrl")} className={`${inp} flex-1`} />
        )}
        <button disabled={!name || createM.isPending} onClick={submit} className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50">{t("create")}</button>
      </div>
      {formError && <p className="text-xs text-red-400">{formError}</p>}
      {msg && <p className="font-mono text-xs text-[var(--muted-foreground)]">{msg}</p>}
      <table className="w-full text-sm"><tbody>{(q.data ?? []).map((c) => (
        <tr key={c.id} className="border-b border-[var(--border)]/40">
          <td className="p-2 font-medium">{c.name}</td>
          <td className="p-2"><span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs">{c.kind}</span></td>
          <td className="p-2 text-right">
            <button onClick={() => testM.mutate(c.id)} className="mr-2 text-xs text-[var(--primary)]">{t("test")}</button>
            <button onClick={() => setDeleteTarget(c)} className="text-xs text-red-400">✕</button>
          </td>
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
