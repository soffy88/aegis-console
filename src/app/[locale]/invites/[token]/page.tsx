"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OFormField, OTextInput } from "@helios/blocks";
import { z } from "zod";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";

interface InviteInfo {
  email: string;
  role: string;
  org_name: string;
  expires_at: string;
}

interface AcceptPayload {
  password: string;
  display_name?: string;
}

interface AcceptResult {
  user_id: string;
}

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
    display_name: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type Fields = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof Fields, string>>;

export default function AcceptInvitePage() {
  const t = useTranslations("invite");
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [fields, setFields] = useState<Fields>({
    password: "",
    confirm: "",
    display_name: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const inviteQuery = useQuery<InviteInfo>({
    queryKey: ["invite", token],
    queryFn: () => aegisFetch<InviteInfo>(paths.inviteVerify(token)),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptPayload) =>
      aegisFetch<AcceptResult>(paths.inviteAccept(token), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => router.push("/"),
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
    const { password, display_name } = result.data;
    acceptMutation.mutate({
      password,
      ...(display_name?.trim() ? { display_name: display_name.trim() } : {}),
    });
  }

  if (inviteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (inviteQuery.isError) {
    const status = (inviteQuery.error as { status?: number })?.status;
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded border p-8 text-center space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-destructive">
            {status === 410 ? t("expired") : t("invalid")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {status === 410 ? t("expiredDesc") : t("invalidDesc")}
          </p>
        </div>
      </div>
    );
  }

  const invite = inviteQuery.data!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle", { orgName: invite.org_name })}
          </p>
          <div className="flex gap-2 items-center pt-1">
            <span className="text-sm text-muted-foreground">{invite.email}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
              {invite.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <OFormField label={t("displayName")} htmlFor="display_name">
            <OTextInput
              id="display_name"
              value={fields.display_name}
              onChange={set("display_name")}
              placeholder={t("displayNamePlaceholder")}
              autoComplete="name"
            />
          </OFormField>

          <OFormField
            label={t("password")}
            htmlFor="password"
            required
            error={errors.password}
            help={t("passwordHelp")}
          >
            <OTextInput
              id="password"
              type="password"
              value={fields.password}
              onChange={set("password")}
              autoComplete="new-password"
            />
          </OFormField>

          <OFormField
            label={t("confirmPassword")}
            htmlFor="confirm"
            required
            error={errors.confirm}
          >
            <OTextInput
              id="confirm"
              type="password"
              value={fields.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
            />
          </OFormField>

          {acceptMutation.isError && (
            <p className="text-sm text-destructive">
              {(acceptMutation.error as Error).message}
            </p>
          )}

          <button
            type="submit"
            disabled={acceptMutation.isPending}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {acceptMutation.isPending ? t("accepting") : t("accept")}
          </button>
        </form>
      </div>
    </div>
  );
}
