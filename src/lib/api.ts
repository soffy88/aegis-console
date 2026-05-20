const BASE = process.env.NEXT_PUBLIC_AEGIS_API ?? "http://localhost:8000";

export class AegisApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AegisApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new AegisApiError(res.status, text);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstalledApp {
  id: string;
  app_name: string;
  app_version: string | null;
  install_dir: string;
  domain: string | null;
  status: "installing" | "completed" | "failed";
  installed_at: string;
}

export interface InstallRequest {
  app_name: string;
  app_version?: string;
  install_dir?: string;
  image_to_pull?: string;
  health_check_container?: string;
  domain?: string;
  domain_target_url?: string;
  register_domain?: boolean;
}

export interface InstallResponse {
  install_id: string;
  status: string;
}

export interface Domain {
  domain: string;
  target_url: string;
  tls_enabled: boolean;
  created_at: string;
}

export interface DomainRegisterRequest {
  domain: string;
  target_url: string;
  tls_mode?: "auto" | "on_demand" | "off";
}

export interface DomainRegisterResponse {
  domain: string;
  target_url: string;
  edge_registered: boolean;
  edge_error: string | null;
}

export interface Event {
  id: string;
  ts: string;
  event_type: string;
  severity: string | null;
  payload: Record<string, unknown>;
  omodul_kind: string | null;
  autoheal_plugin: string | null;
  trace_id: string | null;
}

export interface ContainerStatus {
  container_id: string;
  container_name: string;
  image: string;
  state: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  restart_count: number;
  exit_code: number | null;
  health: string | null;
  ports: Record<string, unknown>;
}

export interface ContainerLogs {
  container_id: string;
  container_name: string;
  lines_fetched: number;
  log_lines: string[];
}

// ---------------------------------------------------------------------------
// API object
// ---------------------------------------------------------------------------

export const api = {
  apps: {
    list: () => request<InstalledApp[]>("/api/v1/apps"),
    get: (id: string) => request<InstalledApp>(`/api/v1/apps/${id}`),
    install: (body: InstallRequest) =>
      request<InstallResponse>("/api/v1/apps/install", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    uninstall: (id: string) =>
      request<void>(`/api/v1/apps/${id}`, { method: "DELETE" }),
  },

  domains: {
    list: () => request<Domain[]>("/api/v1/domains"),
    register: (body: DomainRegisterRequest) =>
      request<DomainRegisterResponse>("/api/v1/domains", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (domain: string) =>
      request<void>(`/api/v1/domains/${domain}`, { method: "DELETE" }),
  },

  events: {
    list: (params?: { hours?: number; limit?: number; service?: string }) => {
      const qs = new URLSearchParams();
      if (params?.hours) qs.set("hours", String(params.hours));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.service) qs.set("service", params.service);
      return request<Event[]>(`/api/v1/events?${qs}`);
    },
    causalChain: (eventId: string) =>
      request<Event[]>(`/api/v1/events/${eventId}/causal-chain`),
  },

  docker: {
    inspect: (container: string) =>
      request<ContainerStatus>(`/api/v1/docker/containers/${container}`),
    start: (container: string) =>
      request<ContainerStatus>(`/api/v1/docker/containers/${container}/start`, {
        method: "POST",
      }),
    stop: (container: string) =>
      request<ContainerStatus>(`/api/v1/docker/containers/${container}/stop`, {
        method: "POST",
      }),
    restart: (container: string) =>
      request<ContainerStatus>(
        `/api/v1/docker/containers/${container}/restart`,
        { method: "POST" },
      ),
    logs: (container: string, tail = 100) =>
      request<ContainerLogs>(
        `/api/v1/docker/containers/${container}/logs?tail=${tail}`,
      ),
  },
};
