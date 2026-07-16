"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
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

type Listing = {
  path: string;
  parent: string | null;
  entries: Entry[];
  total?: number;
  truncated?: boolean;
};

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

const ROW_H = 40; // fixed row height — required for windowed virtualization

// Mirrors MAX_TEXT_BYTES in aegis/server/services/files.py — skip the text-read
// request entirely for files the backend would reject, instead of round-tripping
// a 400 for every video/binary/large file the user clicks.
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

/**
 * Virtualized file list. Only the rows visible in the scroll viewport (plus a
 * small overscan) are mounted, so a directory with tens of thousands of entries
 * keeps ~30 DOM rows instead of one per file — clicking into a big folder can no
 * longer freeze the main thread. Row height is fixed so offsets are pure math.
 */
function VirtualFileTable({
  entries,
  loading,
  error,
  labels,
  onRowClick,
  onManage,
}: {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
  labels: {
    name: string;
    size: string;
    modified: string;
    mode: string;
    manage: string;
    empty: string;
    loading: string;
  };
  onRowClick: (e: Entry) => void;
  onManage: (e: Entry) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(480);
  const total = entries.length;

  // Measure the viewport height (once mounted, per listing, and on window resize).
  // The container height is CSS-fixed (min of 65vh and content), so this never
  // feeds back into layout — no resize loop.
  // Scroll is reset per listing by remounting (the parent keys this component on
  // the directory), so no scroll-reset effect is needed here.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [total]);

  if (error) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">
        {error.message}
      </p>
    );
  }
  if (loading) {
    return <p className="p-3 text-sm text-[var(--muted-foreground)]">{labels.loading}</p>;
  }
  if (total === 0) {
    return <p className="p-3 text-sm text-[var(--muted-foreground)]">{labels.empty}</p>;
  }

  const overscan = 10;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - overscan);
  const end = Math.min(total, Math.ceil((scrollTop + viewH) / ROW_H) + overscan);
  const visible: { e: Entry; i: number }[] = [];
  for (let i = start; i < end; i++) {
    const e = entries[i];
    if (e) visible.push({ e, i });
  }

  return (
    <div className="rounded-md border border-[var(--border)]">
      <div
        className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-medium text-[var(--muted-foreground)]"
        style={{ height: 34 }}
      >
        <span className="min-w-0 flex-1">{labels.name}</span>
        <span className="w-24 text-right">{labels.size}</span>
        <span className="hidden w-44 sm:block">{labels.modified}</span>
        <span className="hidden w-24 md:block">{labels.mode}</span>
        <span className="w-10" />
      </div>
      <div
        ref={ref}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="overflow-y-auto overflow-x-hidden"
        style={{ height: `min(65vh, ${total * ROW_H}px)` }}
      >
        <div style={{ height: total * ROW_H, position: "relative" }}>
          {visible.map(({ e, i }) => (
            <div
              key={e.path}
              onClick={() => onRowClick(e)}
              className="absolute inset-x-0 flex cursor-pointer items-center gap-3 border-b border-[var(--border)]/40 px-3 text-sm hover:bg-[var(--muted)]"
              style={{ top: i * ROW_H, height: ROW_H }}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                <span aria-hidden>{e.is_dir ? "📁" : e.is_symlink ? "🔗" : "📄"}</span>
                <span className={`truncate ${e.is_dir ? "text-[var(--primary)]" : ""}`}>
                  {e.name}
                </span>
              </span>
              <span className="w-24 text-right tabular-nums">
                {e.is_dir ? "—" : fmtBytes(e.size)}
              </span>
              <span className="hidden w-44 text-xs text-[var(--muted-foreground)] sm:block">
                {fmtTime(e.mtime)}
              </span>
              <span className="hidden w-24 font-mono text-xs text-[var(--muted-foreground)] md:block">
                {e.mode}
              </span>
              <span className="flex w-10 justify-end" onClick={(ev) => ev.stopPropagation()}>
                <button
                  className="fm-btn"
                  title={labels.manage}
                  aria-label={labels.manage}
                  onClick={() => onManage(e)}
                >
                  ⋯
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  // Detail panel for a single entry — the ONLY place rename/delete live, so they
  // can't be triggered by an accidental click on the list. `content` is the file
  // text (null for a directory or an un-previewable/too-large file).
  const [detail, setDetail] = useState<{
    entry: Entry;
    content: string | null;
    loading: boolean;
  } | null>(null);
  const [modeInput, setModeInput] = useState("");
  const [confirmChmod, setConfirmChmod] = useState<{ path: string; mode: string; isDir: boolean } | null>(null);
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
      setDetail(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });
  const chmodM = useMutation({
    mutationFn: (v: { path: string; mode: string }) =>
      aegisFetch(paths.fileChmod(orgId!), { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });
  const archiveM = useMutation({
    mutationFn: (v: { kind: "compress" | "extract"; body: unknown }) =>
      aegisFetch(v.kind === "compress" ? paths.fileCompress(orgId!) : paths.fileExtract(orgId!), {
        method: "POST",
        body: JSON.stringify(v.body),
      }),
    onSuccess: () => {
      setError(null);
      setDetail(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  // Open the detail panel for an entry. For a file, fetch its text; a directory
  // (or an unreadable/too-large file) opens with content=null.
  async function openDetail(e: Entry) {
    setError(null);
    setModeInput((e.mode || "").replace("0o", ""));
    setDetail({ entry: e, content: null, loading: !e.is_dir });
    if (e.is_dir || e.size > MAX_TEXT_BYTES) return;
    try {
      const res = await aegisFetch<{ content: string }>(paths.fileRead(orgId!, e.path));
      setDetail((d) =>
        d && d.entry.path === e.path ? { ...d, content: res.content, loading: false } : d,
      );
    } catch (err) {
      setDetail((d) =>
        d && d.entry.path === e.path ? { ...d, content: null, loading: false } : d,
      );
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
    const parent = e.path.slice(0, e.path.length - e.name.length);
    renameM.mutate({ src: e.path, dst: `${parent}${name}` });
    setDetail(null);
  }
  function remove(e: Entry) {
    if (!window.confirm(t("deleteConfirm", { name: e.name }))) return;
    deleteM.mutate(e.path);
    setDetail(null);
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

          {listingQ.data?.truncated && (
            <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-sm text-yellow-500">
              {t("truncated", {
                shown: listingQ.data.entries.length,
                total: listingQ.data.total ?? listingQ.data.entries.length,
              })}
            </p>
          )}

          <VirtualFileTable
            key={`${dir}|${showHidden}`}
            entries={listingQ.data?.entries ?? []}
            loading={listingQ.isLoading}
            error={listingQ.error as Error | null}
            labels={{
              name: t("name"),
              size: t("size"),
              modified: t("modified"),
              mode: t("mode"),
              manage: t("manage"),
              empty: t("empty"),
              loading: tc("loading"),
            }}
            onRowClick={(e) => {
              if (e.is_dir) setCwd(e.path);
              else openDetail(e);
            }}
            onManage={openDetail}
          />
        </>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2 font-mono text-sm">
                <span aria-hidden>
                  {detail.entry.is_dir ? "📁" : detail.entry.is_symlink ? "🔗" : "📄"}
                </span>
                <span className="truncate">{detail.entry.path}</span>
              </span>
              <button className="fm-btn shrink-0" onClick={() => setDetail(null)}>
                {tc("cancel")}
              </button>
            </div>

            {/* File body: editable text, or a hint when not previewable */}
            {!detail.entry.is_dir &&
              (detail.loading ? (
                <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>
              ) : detail.content !== null ? (
                <textarea
                  className="h-[60vh] flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--muted)] p-2 font-mono text-xs"
                  value={detail.content}
                  onChange={(e) =>
                    setDetail((d) => (d ? { ...d, content: e.target.value } : d))
                  }
                />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">{t("notViewable")}</p>
              ))}
            {detail.entry.is_dir && (
              <p className="text-sm text-[var(--muted-foreground)]">{t("directoryHint")}</p>
            )}

            {/* Advanced: permissions + archive */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
              <span className="text-xs text-[var(--muted-foreground)]">{t("permissions")}</span>
              <input
                value={modeInput}
                onChange={(e) => setModeInput(e.target.value)}
                className="w-20 rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1 font-mono text-xs"
                placeholder="755"
              />
              <button
                className="fm-btn"
                onClick={() =>
                  setConfirmChmod({ path: detail.entry.path, mode: modeInput, isDir: detail.entry.is_dir })
                }
              >
                {t("applyChmod")}
              </button>
              <button
                className="fm-btn"
                onClick={() =>
                  archiveM.mutate({
                    kind: "compress",
                    body: { paths: [detail.entry.path], dest: `${detail.entry.path}.zip` },
                  })
                }
              >
                {t("compress")}
              </button>
              {/(\.zip|\.tar\.gz|\.tgz|\.tar)$/.test(detail.entry.name) && (
                <button
                  className="fm-btn"
                  onClick={() =>
                    archiveM.mutate({
                      kind: "extract",
                      body: {
                        path: detail.entry.path,
                        dest_dir: detail.entry.path.replace(/\.(zip|tar\.gz|tgz|tar)$/, ""),
                      },
                    })
                  }
                >
                  {t("extract")}
                </button>
              )}
            </div>

            {/* Footer: safe actions on the left, destructive on the right */}
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <div className="flex gap-2">
                {!detail.entry.is_dir && (
                  <button className="fm-btn" onClick={() => download(detail.entry)}>
                    {t("download")}
                  </button>
                )}
                {!detail.entry.is_dir && detail.content !== null && (
                  <button
                    className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
                    disabled={writeM.isPending}
                    onClick={() =>
                      writeM.mutate({ path: detail.entry.path, content: detail.content ?? "" })
                    }
                  >
                    {tc("save")}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button className="fm-btn" onClick={() => rename(detail.entry)}>
                  {t("rename")}
                </button>
                <button className="fm-btn fm-btn-danger" onClick={() => remove(detail.entry)}>
                  {tc("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <OConfirmDialog
        open={confirmChmod !== null}
        title={t("chmodTitle")}
        description={
          confirmChmod
            ? confirmChmod.isDir
              ? t("chmodConfirmDir", { path: confirmChmod.path, mode: confirmChmod.mode })
              : t("chmodConfirm", { path: confirmChmod.path, mode: confirmChmod.mode })
            : ""
        }
        danger
        confirmLabel={t("applyChmod")}
        onConfirm={() => {
          if (confirmChmod) chmodM.mutate({ path: confirmChmod.path, mode: confirmChmod.mode });
          setConfirmChmod(null);
        }}
        onCancel={() => setConfirmChmod(null)}
      />
    </div>
  );
}
