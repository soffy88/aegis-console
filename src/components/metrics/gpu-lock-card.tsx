"use client";

import { useQuery } from "@tanstack/react-query";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { fmtGB } from "./key-metric-tiles";

interface GpuProcess {
  pid: number;
  process_name: string;
  memory_bytes: number;
  container: string | null;
}

interface GpuLockStatus {
  active_processes: GpuProcess[];
}

// 谁正在用GPU算力——直接读 nvidia-smi 的实际占用进程(见后端 gpu_processes.py),
// 而不是 §5.2 那把只在启动瞬间短暂持有的 NVML 互斥锁,否则长时间推理中的容器会被
// 误判成"闲置"。
export function GpuLockCard({ bare }: { bare?: boolean }) {
  const { data, isLoading } = useQuery<GpuLockStatus>({
    queryKey: ["gpu-lock-status"],
    queryFn: () => aegisFetch<GpuLockStatus>(paths.gpuLockStatus()),
    refetchInterval: 5000,
  });

  const processes = data?.active_processes ?? [];
  const busy = processes.length > 0;
  const occupants = Array.from(new Set(processes.map((p) => p.container ?? p.process_name)));
  const totalMemory = processes.reduce((sum, p) => sum + p.memory_bytes, 0);
  const color = isLoading ? "var(--muted-foreground)" : busy ? "var(--warning)" : "var(--success)";

  return (
    <div
      className={
        bare
          ? "grid h-full w-full grid-rows-[auto_1fr] gap-1.5 p-1 text-left"
          : "flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left shadow-sm"
      }
    >
      <div className="flex items-center justify-between gap-2">
        {!bare && <span className="truncate text-xs font-medium text-muted-foreground">GPU 占用</span>}
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 2px color-mix(in oklch, ${color} 20%, transparent)` }}
        />
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-xl font-semibold tracking-tight text-foreground" title={occupants.join("、")}>
          {isLoading ? "…" : busy ? occupants.join("、") : "闲置"}
        </span>
        {busy && (
          <p className="truncate text-[11px] text-muted-foreground">显存 {fmtGB(totalMemory)}</p>
        )}
      </div>
    </div>
  );
}
