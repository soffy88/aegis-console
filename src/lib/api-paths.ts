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
} as const;
