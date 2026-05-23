export interface App {
  id: string;
  app_name: string;
  app_version: string | null;
  install_dir: string | null;
  domain: string | null;
  status: string;
  installed_at: string;
}

export interface AppInstallPayload {
  app_name: string;
  app_version?: string;
  install_dir: string;
  domain?: string;
}

export interface AppInstallResult {
  install_id: string;
  status: "installing";
}

export interface Container {
  name: string;
  image: string;
  status: string;
  created: string;
  ports: Record<string, string>;
}

export interface ContainerInspect {
  name: string;
  image: string;
  status: string;
  created: string;
  env: string[];
  ports: Record<string, string>;
  labels: Record<string, string>;
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

export interface CausalChainNode {
  id: string;
  parent_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  ts: string;
  depth: number;
}

export interface Domain {
  domain: string;
  target_url: string;
  tls_enabled: boolean;
  created_at: string;
}

export interface DomainCreatePayload {
  domain: string;
  target_url: string;
  tls_enabled: boolean;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

export interface Project {
  name: string;
  health_url: string;
  status: "ok" | "degraded" | "down";
  version: string | null;
  timestamp: string;
}

export interface ProjectHealth {
  status: "ok" | "degraded" | "down";
  version: string | null;
  checks: Record<string, unknown>;
  timestamp: string;
}
