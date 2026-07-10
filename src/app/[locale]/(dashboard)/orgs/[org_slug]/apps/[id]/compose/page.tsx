"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ComposeResp = { app_name: string; is_compose: boolean; compose: string | null };

export default function ComposeEditorPage() {
  const t = useTranslations("compose");
  const { org_slug, id } = useParams<{ org_slug: string; id: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const q = useQuery<ComposeResp>({
    queryKey: ["appCompose", orgId, id],
    queryFn: () => aegisFetch<ComposeResp>(paths.appCompose(orgId!, id)),
    enabled: !!orgId,
  });

  // Seed the editable textarea from the loaded compose. Sync during render
  // (React-recommended over an effect) whenever a newly-fetched value arrives,
  // tracking the last-seen server value in state per the "adjusting state on a
  // prop change" pattern.
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);
  if (q.data?.compose != null && q.data.compose !== lastLoaded) {
    setLastLoaded(q.data.compose);
    setText(q.data.compose);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await aegisFetch(paths.appCompose(orgId!, id), {
        method: "PUT",
        body: JSON.stringify({ compose: text }),
      });
      setMsg({ ok: true, text: t("redeployed") });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">
        {t("title")}{" "}
        {q.data && (
          <span className="font-mono text-base text-[var(--muted-foreground)]">{q.data.app_name}</span>
        )}
      </h1>

      {q.data && !q.data.is_compose ? (
        <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-500">
          {t("notCompose")}
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="h-[60vh] w-full resize-none rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 font-mono text-xs"
          />
          {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
          <button
            onClick={save}
            disabled={saving || !text}
            className="rounded-md bg-[var(--primary)] px-5 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {saving ? t("saving") : t("saveRedeploy")}
          </button>
        </>
      )}
    </div>
  );
}
