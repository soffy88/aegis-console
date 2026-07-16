"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OConfirmDialog } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type DockerImage = {
  id: string;
  tags: string[] | null;
  size_bytes: number | null;
  created_at: string | null;
};

type ColDef<T> = ODataTableData<T>["columns"][number];

function fmtSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function imageRef(img: DockerImage): string {
  return img.tags?.[0] ?? img.id;
}

function Spinner() {
  return (
    <svg className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ImagesPage() {
  const t = useTranslations("images");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pullImage, setPullImage] = useState("");
  const [pullTag, setPullTag] = useState("latest");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showPrune, setShowPrune] = useState(false);

  const images = useQuery<DockerImage[]>({
    queryKey: ["images", orgId],
    queryFn: () => aegisFetch<DockerImage[]>(paths.dockerImages(orgId!)),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["images", orgId] });

  const pullMutation = useMutation({
    mutationFn: () =>
      aegisFetch(paths.dockerImagePull(orgId!), {
        method: "POST",
        body: JSON.stringify({ image: pullImage, tag: pullTag || "latest" }),
      }),
    onSuccess: () => {
      setError(null);
      setPullImage("");
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (ref: string) =>
      aegisFetch(paths.dockerImage(orgId!, encodeURIComponent(ref)) + "?force=true", {
        method: "DELETE",
      }),
    onSuccess: () => {
      setError(null);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const pruneMutation = useMutation({
    mutationFn: () => aegisFetch(paths.dockerSystemPrune(orgId!), { method: "POST" }),
    onSuccess: () => {
      setError(null);
      setShowPrune(false);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const columns: ColDef<DockerImage>[] = [
    {
      accessorKey: "tags",
      header: t("repoTags"),
      cell: ({ row }) => (
        <span className="block max-w-[360px] truncate font-medium" title={imageRef(row.original)}>
          {row.original.tags?.join(", ") || <span className="text-[var(--muted-foreground)]">&lt;none&gt;</span>}
        </span>
      ),
    },
    {
      accessorKey: "id",
      header: t("imageId"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[var(--muted-foreground)]">
          {row.original.id.replace(/^sha256:/, "").slice(0, 12)}
        </span>
      ),
    },
    {
      accessorKey: "size_bytes",
      header: t("size"),
      cell: ({ row }) => fmtSize(row.original.size_bytes),
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(imageRef(row.original));
          }}
          disabled={deleteMutation.isPending}
          className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {tc("delete")}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => setShowPrune(true)}
          disabled={pruneMutation.isPending}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {t("prune")}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] p-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("image")}
          <input
            value={pullImage}
            onChange={(e) => setPullImage(e.target.value)}
            placeholder="nginx"
            className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("tag")}
          <input
            value={pullTag}
            onChange={(e) => setPullTag(e.target.value)}
            placeholder="latest"
            className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
          />
        </label>
        <button
          onClick={() => pullMutation.mutate()}
          disabled={pullMutation.isPending || !pullImage.trim()}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {pullMutation.isPending ? (
            <>
              <Spinner />
              {t("pulling")}
            </>
          ) : (
            t("pull")
          )}
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{error}</p>
      )}

      <div className="overflow-x-auto">
        <ODataTable<DockerImage>
          data={images.data ? { columns, rows: images.data } : null}
          loading={images.isLoading}
          error={images.error as Error | null}
          empty={images.data?.length === 0}
          sortable
        />
      </div>

      <OConfirmDialog
        open={deleteTarget !== null}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget ?? "" })}
        danger
        confirmLabel={tc("delete")}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />

      <OConfirmDialog
        open={showPrune}
        title={t("pruneTitle")}
        description={t("pruneConfirm")}
        danger
        confirmLabel={t("prune")}
        onConfirm={() => pruneMutation.mutate()}
        onCancel={() => setShowPrune(false)}
      />
    </div>
  );
}
