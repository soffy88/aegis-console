import { clsx } from "clsx";

type Status = "completed" | "failed" | "installing" | "running" | "exited" | string;

const VARIANTS: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  running: "bg-green-500/20 text-green-400 border-green-500/30",
  healthy: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  exited: "bg-red-500/20 text-red-400 border-red-500/30",
  unhealthy: "bg-red-500/20 text-red-400 border-red-500/30",
  installing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  starting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export function StatusBadge({ status }: { status: Status }) {
  const cls =
    VARIANTS[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        cls,
      )}
    >
      {status}
    </span>
  );
}
