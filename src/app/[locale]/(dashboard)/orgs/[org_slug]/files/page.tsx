"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisBlob, aegisFetch, aegisUpload } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Entry = {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
  size: number;
  mtime: number;
  mode: string;
};

type Listing = { path: string; parent: string | null; entries: Entry[] };
type ColDef<T> = ODataTableData<T>["columns"][number];

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function fmtTime(epoch: number): string {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleString();
}

export default function FilesPage() {
  const t = useTranslations("files");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const [cwd, setCwd] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ path: string; content: string } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const rootsQ = useQuery<{ roots: string[] }>({
    queryKey: ["fileRoots", orgId],
    queryFn: () => aegisFetch<{ roots: string[] }>(paths.fileRoots(orgId!)),
    enabled: !!orgId,
  });
  const roots = useMemo(() => rootsQ.data?.roots ?? [], [rootsQ.data]);

  // Effective directory: explicit navigation wins, else default to the first root.
  const dir = cwd ?? roots[0] ?? null;

  const listingQ = useQuery<Listing>({
    queryKey: ["fileList", orgId, dir, showHidden],
    queryFn: () => aegisFetch<Listing>(paths.fileList(orgId!, dir!, showHidden)),
    enabled: !!orgId && !!dir,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["fileList", orgId, dir] });
  const wrap = (p: Promise<unknown>) =>
    p.then(() => setError(null)).catch((e: Error) => setError(e.message));

  const mkdirM = useMutation({
    mutationFn: (path: string) =>
      aegisFetch(paths.fileMkdir(orgId!), { method: "POST", body: JSON.stringify({ path }) }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });
  const renameM = useMutation({
    mutationFn: (v: { src: string; dst: string }) =>
      aegisFetch(paths.fileRename(orgId!), { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });
  const deleteM = useMutation({
    mutationFn: (path: string) =>
      aegisFetch(paths.fileDelete(orgId!, path), { method: "DELETE" }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });
  const writeM = useMutation({
    mutationFn: (v: { path: string; content: string }) =>
      aegisFetch(paths.fileWrite(orgId!), { method: "PUT", body: JSON.stringify(v) }),
    onSuccess: () => {
      setError(null);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function openFile(e: Entry) {
    try {
      const res = await aegisFetch<{ content: string }>(paths.fileRead(orgId!, e.path));
      setEditing({ path: e.path, content: res.content });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function download(e: Entry) {
    try {
      const blob = await aegisBlob(paths.fileDownload(orgId!, e.path));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = e.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f || !dir) return;
    const form = new FormData();
    form.append("dir", dir);
    form.append("file", f);
    await wrap(aegisUpload(paths.fileUpload(orgId!), form).then(invalidate));
  }

  function newFolder() {
    if (!dir) return;
    const name = window.prompt(t("newFolderPrompt"));
    if (!name) return;
    mkdirM.mutate(`${dir}/${name}`);
  }
  function rename(e: Entry) {
    const name = window.prompt(t("renamePrompt"), e.name);
    if (!name || name === e.name) return;
    const dir = e.path.slice(0, e.path.length - e.name.length);
    renameM.mutate({ src: e.path, dst: `${dir}${name}` });
  }
  function remove(e: Entry) {
    if (!window.confirm(t("deleteConfirm", { name: e.name }))) return;
    deleteM.mutate(e.path);
  }

  const breadcrumbs = useMemo(() => {
    if (!dir) return [];
    const root = roots.find((r) => dir === r || dir.startsWith(r + "/"));
    if (!root) return [{ label: dir, path: dir }];
    const rest = dir.slice(root.length).split("/").filter(Boolean);
    const crumbs = [{ label: root, path: root }];
    let acc = root;
    for (const seg of rest) {
      acc = `${acc}/${seg}`;
      crumbs.push({ label: seg, path: acc });
    }
    return crumbs;
  }, [dir, roots]);

  const columns: ColDef<Entry>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => {
        const e = row.original;
        return (
          <span className="flex items-center gap-2 font-medium">
            <span aria-hidden>{e.is_dir ? "📁" : e.is_symlink ? "🔗" : "📄"}</span>
            <span className={e.is_dir ? "text-[var(--primary)]" : ""}>{e.name}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "size",
      header: t("size"),
      cell: ({ row }) => (row.original.is_dir ? "—" : fmtBytes(row.original.size)),
    },
    {
      accessorKey: "mtime",
      header: t("modified"),
      cell: ({ row }) => (
        <span className="text-xs text-[var(--muted-foreground)]">{fmtTime(row.original.mtime)}</span>
      ),
    },
    {
      accessorKey: "mode",
      header: t("mode"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[var(--muted-foreground)]">{row.original.mode}</span>
      ),
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
            {!e.is_dir && (
              <>
                <button className="fm-btn" onClick={() => openFile(e)}>
                  {t("view")}
                </button>
                <button className="fm-btn" onClick={() => download(e)}>
                  {t("download")}
                </button>
              </>
            )}
            <button className="fm-btn" onClick={() => rename(e)}>
              {t("rename")}
            </button>
            <button className="fm-btn fm-btn-danger" onClick={() => remove(e)}>
              {tc("delete")}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <style>{`
        .fm-btn{border:1px solid var(--border);border-radius:.375rem;padding:.15rem .5rem;font-size:.75rem}
        .fm-btn:hover{background:var(--muted)}
        .fm-btn-danger{border-color:rgb(239 68 68 / .3);color:rgb(248 113 113)}
        .fm-btn-danger:hover{background:rgb(239 68 68 / .1)}
      `}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          {t("showHidden")}
        </label>
      </div>

      {roots.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {roots.map((r) => (
            <button
              key={r}
              onClick={() => setCwd(r)}
              className={`rounded-md border px-2 py-1 font-mono text-xs ${
                dir === r || dir?.startsWith(r + "/")
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-[var(--border)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {roots.length === 0 && !rootsQ.isLoading && (
        <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">
          {t("disabled")}
        </p>
      )}

      {roots.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {breadcrumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-1">
                {i > 0 && <span className="text-[var(--muted-foreground)]">/</span>}
                <button
                  onClick={() => setCwd(c.path)}
                  className="rounded px-1 font-mono text-xs hover:bg-[var(--muted)]"
                >
                  {c.label}
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="fm-btn" onClick={() => listingQ.refetch()}>
              {t("refresh")}
            </button>
            <button className="fm-btn" onClick={newFolder}>
              {t("newFolder")}
            </button>
            <button className="fm-btn" onClick={() => uploadRef.current?.click()}>
              {t("upload")}
            </button>
            {listingQ.data?.parent && (
              <button className="fm-btn" onClick={() => setCwd(listingQ.data!.parent)}>
                {t("up")}
              </button>
            )}
            <input ref={uploadRef} type="file" className="hidden" onChange={onUpload} />
          </div>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <ODataTable<Entry>
              data={listingQ.data ? { columns, rows: listingQ.data.entries } : null}
              loading={listingQ.isLoading}
              error={listingQ.error as Error | null}
              empty={listingQ.data?.entries.length === 0}
              onRowClick={(e) => {
                if (e.is_dir) setCwd(e.path);
              }}
              sortable
            />
          </div>
        </>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="flex h-[80vh] w-full max-w-4xl flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="truncate font-mono text-sm">{editing.path}</span>
              <button className="fm-btn" onClick={() => setEditing(null)}>
                {tc("cancel")}
              </button>
            </div>
            <textarea
              className="flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--muted)] p-2 font-mono text-xs"
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
                disabled={writeM.isPending}
                onClick={() => writeM.mutate({ path: editing.path, content: editing.content })}
              >
                {tc("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
