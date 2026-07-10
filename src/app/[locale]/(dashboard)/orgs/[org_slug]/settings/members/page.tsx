"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OFormField, OTextInput, OConfirmDialog } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { usePermission } from "@/lib/auth/use-permission";

interface Member {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
}

interface InvitePayload {
  email: string;
  role: string;
}

type ColDef<T> = ODataTableData<T>["columns"][number];

const ASSIGNABLE_ROLES = ["admin", "operator", "member", "viewer"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// Privileged roles whose demotion risks removing the last admin (lockout).
const PRIVILEGED_ROLES = new Set(["owner", "admin"]);
const ROLE_RANK: Record<string, number> = { viewer: 0, operator: 1, member: 2, admin: 3, owner: 4 };

export default function MembersPage() {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const { canAdmin } = usePermission();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [roleChange, setRoleChange] = useState<{ member: Member; role: string } | null>(null);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["members", orgId],
    queryFn: () => aegisFetch<Member[]>(paths.members(orgId!)),
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: InvitePayload) =>
      aegisFetch(paths.inviteCreate(orgId!), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setInviteEmail("");
      setInviteError(null);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 4000);
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      aegisFetch(paths.member(orgId!, userId), {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      setActionError(null);
      setRoleChange(null);
      qc.invalidateQueries({ queryKey: ["members", orgId] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      aegisFetch(paths.member(orgId!, userId), { method: "DELETE" }),
    onSuccess: () => {
      setActionError(null);
      setRemoveTarget(null);
      qc.invalidateQueries({ queryKey: ["members", orgId] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  function memberLabel(m: Member): string {
    return m.display_name ?? m.email;
  }
  /** A demotion of a privileged member risks removing the last admin (lockout). */
  function isRisky(m: Member, newRole: string): boolean {
    return PRIVILEGED_ROLES.has(m.role) && (ROLE_RANK[newRole] ?? 0) < (ROLE_RANK[m.role] ?? 0);
  }

  const columns: ColDef<Member>[] = [
    { accessorKey: "email", header: t("email") },
    {
      accessorKey: "display_name",
      header: t("name"),
      cell: ({ row }) => row.original.display_name ?? "—",
    },
    {
      accessorKey: "role",
      header: t("role"),
      cell: ({ row }) =>
        canAdmin ? (
          <select
            value={row.original.role}
            onChange={(e) =>
              setRoleChange({ member: row.original, role: e.target.value })
            }
            className="rounded border px-1 py-0.5 text-sm"
            disabled={row.original.role === "owner"}
          >
            {row.original.role === "owner" && (
              <option value="owner">owner</option>
            )}
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          row.original.role
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.role === "owner" || !canAdmin ? null : (
          <button
            onClick={() => setRemoveTarget(row.original)}
            className="rounded-md border border-red-500/30 px-2 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            {tc("remove")}
          </button>
        ),
    },
  ];

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <ODataTable<Member>
        data={members ? { columns, rows: members } : null}
        loading={isLoading}
        empty={members?.length === 0}
      />
      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      {canAdmin && (
      <section className="rounded border p-6 space-y-4">
        <h2 className="text-lg font-semibold">{t("inviteTitle")}</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <OFormField label={t("email")} htmlFor="invite_email" required>
              <OTextInput
                id="invite_email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </OFormField>
          </div>
          <div>
            <label
              htmlFor="invite_role"
              className="block text-sm font-medium mb-1"
            >
              {t("role")}
            </label>
            <select
              id="invite_role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AssignableRole)}
              className="rounded border px-3 py-2 text-sm"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={inviteMutation.isPending || !orgId}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {inviteMutation.isPending ? t("sending") : t("sendInvite")}
          </button>
        </form>
        {inviteError && (
          <p className="text-sm text-destructive">{inviteError}</p>
        )}
        {inviteSuccess && (
          <p className="text-sm text-green-600">{t("inviteSent")}</p>
        )}
      </section>
      )}

      <OConfirmDialog
        open={removeTarget !== null}
        title={t("removeTitle")}
        description={t("removeConfirm", { name: removeTarget ? memberLabel(removeTarget) : "" })}
        danger
        confirmLabel={tc("remove")}
        onConfirm={() => { if (removeTarget) removeMutation.mutate(removeTarget.user_id); }}
        onCancel={() => setRemoveTarget(null)}
      />

      <OConfirmDialog
        open={roleChange !== null}
        title={t("roleChangeTitle")}
        description={
          roleChange && isRisky(roleChange.member, roleChange.role)
            ? t("roleChangeSelfConfirm", { role: roleChange.role })
            : t("roleChangeConfirm", {
                name: roleChange ? memberLabel(roleChange.member) : "",
                role: roleChange?.role ?? "",
              })
        }
        danger={!!roleChange && isRisky(roleChange.member, roleChange.role)}
        confirmLabel={tc("save")}
        onConfirm={() => {
          if (roleChange)
            changeRoleMutation.mutate({ userId: roleChange.member.user_id, role: roleChange.role });
        }}
        onCancel={() => setRoleChange(null)}
      />
    </div>
  );
}
