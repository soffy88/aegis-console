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
  host_port?: number;
  params?: Record<string, string>;
}

export interface AppInstallResult {
  install_id: string;
  status: "installing";
  host_port?: number | null;
}

export interface Container {
  name: string;
  image: string;
  state?: string;
  status: string;
  created: string;
  /** Real timestamp field returned by the backend (oprim ContainerInfo). */
  started_at?: string;
  health?: string;
  container_id?: string;
  /** Docker labels; `com.docker.compose.project` drives project grouping. */
  labels?: Record<string, string>;
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

/** C2-2: Alert rule configuration. */
export interface AlertRule {
  rule_id: string;
  org_id: string;
  project_id: string;
  name: string;
  metric: string;
  threshold_warn: number | null;
  threshold_critical: number | null;
  operator: ">=" | ">" | "<" | "<=" | "==";
  throttle_seconds: number;
  escalation_delay_seconds: number;
  dedup_bucket_seconds: number;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleCreate {
  name: string;
  metric: string;
  threshold_warn?: number;
  threshold_critical?: number;
  operator?: ">=" | ">" | "<" | "<=" | "==";
  throttle_seconds?: number;
  escalation_delay_seconds?: number;
  dedup_bucket_seconds?: number;
  enabled?: boolean;
}

export type AlertRuleUpdate = Partial<AlertRuleCreate>;

export interface AlertFiredHistory {
  fired_id: string;
  rule_id: string;
  org_id: string;
  project_id: string;
  dedup_key: string;
  severity: "warn" | "critical";
  current_value: number | null;
  triggered_reason: string | null;
  fired_at: string;
  escalated_at: string | null;
  last_seen_at: string;
}

/** C2-5: Webhook subscription. */
export interface WebhookSubscription {
  sub_id: string;
  org_id: string;
  name: string;
  url: string;
  /** Never contains the raw secret value — backend returns has_secret:bool only. */
  has_secret: boolean;
  event_types: string[];
  retry_count: number;
  retry_backoff_seconds: number[];
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookSubscriptionCreate {
  name: string;
  url: string;
  secret_encrypted?: string;
  event_types: string[];
  retry_count?: number;
  retry_backoff_seconds?: number[];
  enabled?: boolean;
}

export interface WebhookDelivery {
  delivery_id: string;
  sub_id: string;
  org_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempt_no: number;
  max_attempts: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  state: "pending" | "in_flight" | "succeeded" | "failed" | "dead_letter";
  created_at: string;
  succeeded_at: string | null;
}

/** C2-4: Release gate — high-risk autoheal action awaiting human approval. */
export interface ReleaseGate {
  gate_id: string;
  org_id: string;
  project_id: string;
  autoheal_event_id: string | null;
  action_kind: string;
  action_payload: Record<string, unknown>;
  requested_by: string;
  requested_at: string;
  state: "pending" | "approved" | "rejected" | "expired";
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  expires_at: string;
}

export interface ReleaseGateDecideRequest {
  decision: "approved" | "rejected";
  decision_reason: string;
}

export interface Node {
  node_id: string;
  host: string;
  node_label: string;
  docker_mode: "tcp" | "ssh" | "unreachable";
  docker_host_url: string | null;
  server_version: string | null;
  os: string | null;
  arch: string | null;
  cpus: number | null;
  memory_bytes: number | null;
  registered_at: string;
  // 运行时健康数据（sweep 结果）
  reachable?: boolean;
  containers_running?: number;
  containers_total?: number;
}

export interface NodeRegisterPayload {
  host: string;
  node_label: string;
  ssh_username: string;
  docker_connection_mode?: "auto" | "tcp" | "ssh";
  key_path?: string;
  ssh_port?: number;
  docker_tcp_port?: number;
}

export interface ContainerExecPayload {
  command: string[];
  workdir?: string;
  timeout_sec?: number;
}

export interface ContainerExecResult {
  container_id: string;
  command: string[];
  exit_code: number;
  stdout: string;
  stderr: string;
  elapsed_ms: number;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  created_at: string;
  labels: Record<string, string>;
}

export interface AutoHealEvent {
  id: string;
  cycle_id: string;
  severity: "critical" | "warning" | "info";
  source: string;          // "container:{name}" 或 "node:{host}"
  reason: string;
  value: number | null;
  created_at: string;
  handled: boolean;
  handled_at: string | null;
}

export interface AutoHealStats {
  today_total: number;
  today_handled: number;
  pending_critical: number;
  pending_total: number;
}

export interface Backup {
  id: string;
  app_slug: string;
  instance_name: string;
  backup_key: string | null;
  size_bytes: number;
  status: "pending" | "completed" | "failed" | "restoring";
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface BackupRequest {
  app_slug: string;
  instance_name: string;
  target_volume: string;
}

export interface RestoreRequest {
  target_volume: string;
  container_id?: string;
}
