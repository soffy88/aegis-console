"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { getValidToken } from "@/lib/auth/token-store";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

const ContainerTerminal = dynamic(
  () => import("@/components/ContainerTerminal").then((m) => m.ContainerTerminal),
  { ssr: false },
);

export default function HostTerminalPage() {
  const t = useTranslations("hostTerminal");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset the open terminal when the active org changes (adjusting state during
  // render on a prop change — the React-recommended alternative to an effect,
  // tracking the previous org in state).
  const [prevOrgId, setPrevOrgId] = useState(orgId);
  if (prevOrgId !== orgId) {
    setPrevOrgId(orgId);
    if (ready) setReady(false);
  }

  async function start() {
    if (!orgId) return;
    setErr(null);
    setStarting(true);
    try {
      await aegisFetch(paths.hostShell(orgId), { method: "POST" });
      setToken(getValidToken() ?? "");
      setReady(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">
        {t("warning")}
      </p>
      <p className="text-sm text-[var(--muted-foreground)]">
        {t("hint")} <code className="rounded bg-[var(--muted)] px-1 font-mono">chroot /host bash</code>
      </p>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {!ready ? (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!orgId || starting}
          className="rounded-md bg-[var(--primary)] px-5 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {starting ? t("starting") : t("open")}
        </button>
      ) : (
        <div className="h-[65vh] overflow-hidden rounded-md border border-[var(--border)]">
          <ContainerTerminal
            orgId={orgId!}
            containerName="aegis-host-shell"
            token={token}
            onClose={() => setReady(false)}
          />
        </div>
      )}

      <OConfirmDialog
        open={confirmOpen}
        title={t("confirmTitle")}
        description={t("confirmDescription")}
        danger
        confirmLabel={t("open")}
        onConfirm={() => { setConfirmOpen(false); void start(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
