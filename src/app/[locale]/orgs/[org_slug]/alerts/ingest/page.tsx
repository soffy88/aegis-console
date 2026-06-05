"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OJsonViewer, OFormField, OTextInput } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface AlertPayload {
  alert_name: string;
  severity: string;
  service: string;
  payload: string;
}

export default function AlertIngestPage() {
  const t = useTranslations("alertIngest");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const [form, setForm] = useState<AlertPayload>({
    alert_name: "",
    severity: "warning",
    service: "",
    payload: "{}",
  });
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);
  const [lastRequest, setLastRequest] = useState<Record<string, unknown> | null>(null);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      aegisFetch<unknown>(paths.alertIngest(orgId!), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => setLastResponse(data as Record<string, unknown>),
    onError: (err) => setLastResponse({ error: (err as Error).message }),
  });

  function setField(key: keyof AlertPayload) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let extraPayload: unknown = {};
    try { extraPayload = JSON.parse(form.payload); } catch { extraPayload = {}; }
    const body = {
      alert_name: form.alert_name,
      severity: form.severity,
      ...(form.service ? { service: form.service } : {}),
      payload: extraPayload,
    };
    setLastRequest(body as Record<string, unknown>);
    mutation.mutate(body);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm opacity-70">Fire a test alert directly to the ingest endpoint.</p>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <OFormField label={t("alertName")} htmlFor="alert_name" required>
          <OTextInput id="alert_name" value={form.alert_name} onChange={setField("alert_name")} placeholder="cpu_high" />
        </OFormField>
        <OFormField label={t("severity")} htmlFor="severity">
          <OTextInput id="severity" value={form.severity} onChange={setField("severity")} placeholder="warning" />
        </OFormField>
        <OFormField label={t("service")} htmlFor="service">
          <OTextInput id="service" value={form.service} onChange={setField("service")} placeholder="api-server" />
        </OFormField>
        <OFormField label={t("payload")} htmlFor="payload">
          <OTextInput id="payload" value={form.payload} onChange={setField("payload")} placeholder='{"key": "value"}' />
        </OFormField>
        <button
          type="submit"
          disabled={mutation.isPending || !form.alert_name || !orgId}
          className="rounded bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? t("sending") : t("send")}
        </button>
      </form>

      {lastRequest && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("request")}</h2>
          <OJsonViewer data={lastRequest} defaultExpandDepth={3} />
        </section>
      )}
      {lastResponse && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("response")}</h2>
          <OJsonViewer data={lastResponse} defaultExpandDepth={3} />
        </section>
      )}
    </div>
  );
}
