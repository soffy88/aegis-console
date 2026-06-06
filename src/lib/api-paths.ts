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
} as const;
