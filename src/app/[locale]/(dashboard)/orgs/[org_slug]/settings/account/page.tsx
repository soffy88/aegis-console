"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { aegisFetch, ApiError } from "@/lib/api";
import { paths } from "@/lib/api-paths";

export default function AccountPage() {
  const t = useTranslations("account");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ ok: false, text: t("tooShort") });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: t("mismatch") });
      return;
    }
    setBusy(true);
    try {
      await aegisFetch(paths.changePassword(), {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setMsg({ ok: true, text: t("success") });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      // 400 == wrong current password (see auth router); anything else surfaces raw.
      const text =
        err instanceof ApiError && err.status === 400 ? t("wrongCurrent") : (err as Error).message;
      setMsg({ ok: false, text });
    } finally {
      setBusy(false);
    }
  }

  const input =
    "block w-full rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm";
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm text-[var(--muted-foreground)]">{t("currentPassword")}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={input}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-[var(--muted-foreground)]">{t("newPassword")}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={input}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-[var(--muted-foreground)]">{t("confirmPassword")}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </label>
        {msg && (
          <p
            className={`rounded-md border p-2 text-sm ${
              msg.ok
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {busy ? t("saving") : t("submit")}
        </button>
      </form>
    </div>
  );
}
