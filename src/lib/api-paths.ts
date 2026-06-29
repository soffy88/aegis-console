/**
 * Centralized URL builder for Aegis backend API paths (C1-4 org-scoped routes).
 *
 * All paths follow the pattern: /api/v1/orgs/{org_id}/{resource}/...
 * The org_id comes from the active org context; never hardcoded in pages.
 */

export const paths = {
  // Auth
  login: () => `/api/v1/auth/login`,
  logout: () => `/api/v1/auth/logout`,
  refresh: () => `/api/v1/auth/refresh`,
  me: () => `/api/v1/auth/me`,

  // Projects
  projects: (orgId: string) => `/api/v1/orgs/${orgId}/projects`,
  project: (orgId: string, projectId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}`,
  projectHealth: (orgId: string, projectId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/health`,

  // Apps
  apps: (orgId: string) => `/api/v1/orgs/${orgId}/apps`,
  app: (orgId: string, appId: string) => `/api/v1/orgs/${orgId}/apps/${appId}`,
  appInstall: (orgId: string) => `/api/v1/orgs/${orgId}/apps/install`,

  // Docker
  containers: (orgId: string) => `/api/v1/orgs/${orgId}/docker/containers`,
  container: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}`,
  containerStart: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}/start`,
  containerStop: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}/stop`,
  containerRestart: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}/restart`,
  containerLogs: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}/logs`,

  // Events
  events: (orgId: string) => `/api/v1/orgs/${orgId}/events`,
  event: (orgId: string, eventId: string) =>
    `/api/v1/orgs/${orgId}/events/${eventId}`,

  // Alerts
  alertIngest: (orgId: string) => `/api/v1/orgs/${orgId}/alerts/ingest`,

  // Runbooks
  runbooks: (orgId: string) => `/api/v1/orgs/${orgId}/runbooks`,
  runbook: (orgId: string, runbookId: string) =>
    `/api/v1/orgs/${orgId}/runbooks/${runbookId}`,
  runbookExecution: (orgId: string, executionId: string) =>
    `/api/v1/orgs/${orgId}/runbooks/executions/${executionId}`,

  // Domains
  domains: (orgId: string) => `/api/v1/orgs/${orgId}/domains`,
  domain: (orgId: string, domainName: string) =>
    `/api/v1/orgs/${orgId}/domains/${domainName}`,

  // Edge routes (Caddy admin)
  edgeRoutes: (orgId: string) => `/api/v1/orgs/${orgId}/edge/routes`,
  edgeRoute: (orgId: string, routeId: string) =>
    `/api/v1/orgs/${orgId}/edge/routes/${routeId}`,

  // Store
  store: (orgId: string) => `/api/v1/orgs/${orgId}/store`,

  // Health (public — no org scope)
  health: () => `/api/v1/health`,

  // Release gates (C2-4)
  releaseGatesList: (orgId: string, projectId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/release-gates`,
  releaseGateGet: (orgId: string, projectId: string, gateId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/release-gates/${gateId}`,
  releaseGateDecide: (orgId: string, projectId: string, gateId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/release-gates/${gateId}/decide`,

  // Alert rules (C2-2)
  alertRulesList: (orgId: string, projectId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/alert-rules`,
  alertRuleGet: (orgId: string, projectId: string, ruleId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/alert-rules/${ruleId}`,
  alertRuleCreate: (orgId: string, projectId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/alert-rules`,
  alertRuleUpdate: (orgId: string, projectId: string, ruleId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/alert-rules/${ruleId}`,
  alertRuleDelete: (orgId: string, projectId: string, ruleId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/alert-rules/${ruleId}`,
  alertFiredList: (orgId: string, projectId: string) =>
    `/api/v1/orgs/${orgId}/projects/${projectId}/alerts-fired`,

  // Webhooks (C2-5, org-scoped)
  webhooksList: (orgId: string) => `/api/v1/orgs/${orgId}/webhooks`,
  webhookGet: (orgId: string, subId: string) =>
    `/api/v1/orgs/${orgId}/webhooks/${subId}`,
  webhookCreate: (orgId: string) => `/api/v1/orgs/${orgId}/webhooks`,
  webhookUpdate: (orgId: string, subId: string) =>
    `/api/v1/orgs/${orgId}/webhooks/${subId}`,
  webhookDelete: (orgId: string, subId: string) =>
    `/api/v1/orgs/${orgId}/webhooks/${subId}`,
  webhookTest: (orgId: string, subId: string) =>
    `/api/v1/orgs/${orgId}/webhooks/${subId}/test`,
  webhookDeliveries: (orgId: string, subId: string) =>
    `/api/v1/orgs/${orgId}/webhooks/${subId}/deliveries`,
  webhookEventTypes: (orgId: string) =>
    `/api/v1/orgs/${orgId}/webhooks/event-types`,

  // Members + Invites (S7)
  members: (orgId: string) => `/api/v1/orgs/${orgId}/members`,
  member: (orgId: string, userId: string) =>
    `/api/v1/orgs/${orgId}/members/${userId}`,
  inviteCreate: (orgId: string) => `/api/v1/orgs/${orgId}/invites`,
  inviteVerify: (token: string) => `/api/v1/invites/${token}`,
  inviteAccept: (token: string) => `/api/v1/invites/${token}/accept`,

  // Incidents (S8)
  incidents: (orgId: string) => `/api/v1/orgs/${orgId}/incidents`,
  incident: (orgId: string, incidentId: string) =>
    `/api/v1/orgs/${orgId}/incidents/${incidentId}`,
  incidentPostmortem: (orgId: string, incidentId: string) =>
    `/api/v1/orgs/${orgId}/incidents/${incidentId}/postmortem`,

  // Nodes (多主机节点管理)
  nodes: (orgId: string) => `/api/v1/orgs/${orgId}/nodes`,
  node: (orgId: string, nodeId: string) => `/api/v1/orgs/${orgId}/nodes/${nodeId}`,
  nodeRegister: (orgId: string) => `/api/v1/orgs/${orgId}/nodes/register`,
  nodeContainers: (orgId: string, nodeId: string) =>
    `/api/v1/orgs/${orgId}/nodes/${nodeId}/containers`,

  // Docker — 新增 Batch D 路径
  containerExec: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}/exec`,
  containerStats: (orgId: string, name: string) =>
    `/api/v1/orgs/${orgId}/docker/containers/${name}/stats`,
  dockerNetworks: (orgId: string) => `/api/v1/orgs/${orgId}/docker/networks`,
  dockerNetwork: (orgId: string, networkId: string) =>
    `/api/v1/orgs/${orgId}/docker/networks/${networkId}`,
  dockerVolumes: (orgId: string) => `/api/v1/orgs/${orgId}/docker/volumes`,

  // AutoHeal
  autohealEvents: (orgId: string) => `/api/v1/orgs/${orgId}/autoheal/events`,
  autohealEvent: (orgId: string, eventId: string) =>
    `/api/v1/orgs/${orgId}/autoheal/events/${eventId}`,
  autohealRetry: (orgId: string, eventId: string) =>
    `/api/v1/orgs/${orgId}/autoheal/events/${eventId}/retry`,
  autohealStats: (orgId: string) => `/api/v1/orgs/${orgId}/autoheal/stats`,

  // Brain / RCA
  brainStatus: (orgId: string) => `/api/v1/orgs/${orgId}/brain/status`,
  brainTriage: (orgId: string) => `/api/v1/orgs/${orgId}/brain/triage`,
  brainInvestigate: (orgId: string) => `/api/v1/orgs/${orgId}/brain/investigate`,
  brainPlan: (orgId: string) => `/api/v1/orgs/${orgId}/brain/plan`,

  // Backups
  backups: (orgId: string) => `/api/v1/orgs/${orgId}/backups`,
  backup: (orgId: string, backupId: string) => `/api/v1/orgs/${orgId}/backups/${backupId}`,
  backupRestore: (orgId: string, backupId: string) =>
    `/api/v1/orgs/${orgId}/backups/${backupId}/restore`,

  // Metrics (host-level infra; not org-scoped)
  metricsSeries: (hours = 24) => `/api/v1/metrics/series?hours=${hours}`,
  metricsQuery: (params: {
    metric_name: string;
    hostname?: string;
    hours?: number;
    bucket_seconds?: number;
    agg?: string;
  }) => {
    const q = new URLSearchParams({ metric_name: params.metric_name });
    if (params.hostname) q.set("hostname", params.hostname);
    if (params.hours) q.set("hours", String(params.hours));
    if (params.bucket_seconds) q.set("bucket_seconds", String(params.bucket_seconds));
    if (params.agg) q.set("agg", params.agg);
    return `/api/v1/metrics/query?${q.toString()}`;
  },
} as const;
