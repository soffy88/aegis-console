"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OFormField, OTextInput } from "@helios/blocks";
import { z } from "zod";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import type { AppInstallPayload, AppInstallResult, Project } from "@/types/aegis";

const schema = z.object({
  app_name: z.string().min(1, "Required"),
  install_dir: z
    .string()
    .min(1, "Required")
    .refine((v) => !/\s/.test(v), "No whitespace allowed"),
  app_version: z.string().optional(),
  domain: z.string().optional(),
  host_port: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{2,5}$/.test(v), "Port must be 2-5 digits"),
});

type Fields = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof Fields, string>>;

export default function InstallPage() {
  const t = useTranslations("apps");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromStore = searchParams.get("from") === "store";
  const storeSlug = searchParams.get("slug") ?? "";

  const [fields, setFields] = useState<Fields>({
    app_name: fromStore ? storeSlug : "",
    install_dir: "",
    app_version: "",
    domain: "",
    host_port: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: () => aegisFetch<Project[]>(paths.projects(orgId!)),
    enabled: !!orgId,
    staleTime: 60_000,
  });
  const defaultProjectId = projects?.[0]?.id ?? null;

  const mutation = useMutation({
    mutationFn: (payload: AppInstallPayload) =>
      aegisFetch<AppInstallResult>(
        `${paths.appInstall(orgId!)}?project_id=${defaultProjectId ?? ""}`,
        { method: "POST", body: JSON.stringify(payload) },
      ),
    onSuccess: () => router.push(`/orgs/${org_slug}/apps`),
  });

  function set(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(fields);
    if (!result.success) {
      const fe: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Fields;
        fe[key] = issue.message;
      }
      setErrors(fe);
      return;
    }
    const { app_name, install_dir, app_version, domain, host_port } = result.data;
    mutation.mutate({
      app_name,
      install_dir,
      ...(app_version ? { app_version } : {}),
      ...(domain ? { domain } : {}),
      ...(host_port ? { host_port: Number(host_port) } : {}),
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{t("installTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <OFormField label="App Name" htmlFor="app_name" required error={errors.app_name}>
          <OTextInput id="app_name" value={fields.app_name} onChange={set("app_name")} placeholder="my-app" />
        </OFormField>
        <OFormField label="Install Directory" htmlFor="install_dir" required error={errors.install_dir} help="Absolute path, no spaces">
          <OTextInput id="install_dir" value={fields.install_dir} onChange={set("install_dir")} placeholder="/opt/apps/my-app" />
        </OFormField>
        <OFormField label="Version" htmlFor="app_version" error={errors.app_version}>
          <OTextInput id="app_version" value={fields.app_version} onChange={set("app_version")} placeholder="1.0.0" />
        </OFormField>
        <OFormField label="Domain" htmlFor="domain" error={errors.domain}>
          <OTextInput id="domain" value={fields.domain} onChange={set("domain")} placeholder="app.example.com" />
        </OFormField>
        <OFormField
          label="Host Port"
          htmlFor="host_port"
          error={errors.host_port}
          help="Multi-container apps only. Leave blank to use the default (auto-freed if taken)."
        >
          <OTextInput id="host_port" value={fields.host_port ?? ""} onChange={set("host_port")} placeholder="18090" />
        </OFormField>
        {mutation.isError && (
          <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending || !orgId || !defaultProjectId}
          className="rounded bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? t("installing") : t("install")}
        </button>
      </form>
    </div>
  );
}
