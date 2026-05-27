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

/** C1-4 DB-backed project (matches backend ProjectRepository). */
export interface Project {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  display_name: string;
  environment: string;
  docker_labels: Record<string, string> | null;
  config: Record<string, unknown> | null;
  archived_at: string | null;
  created_at: string;
}

/** Response from GET /orgs/{org_id}/projects/{id}/health */
export interface ProjectHealth {
  project_id: string;
  slug: string;
  health_url: string;
  healthy: boolean;
  status_code: number | null;
  elapsed_ms: number | null;
  error: string | null;
}

/** User org membership (from /auth/me). */
export interface OrgMembership {
  org_id: string;
  slug: string;
  role: string;
}
