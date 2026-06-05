import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AlertRuleDetailPage from "@/app/[locale]/orgs/[org_slug]/projects/[project_slug]/alert-rules/[rule_id]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({
  useOrgIdBySlug: vi.fn().mockReturnValue("org-111"),
}));
vi.mock("@/hooks/use-project-id", () => ({
  useProjectIdBySlug: vi.fn().mockReturnValue("proj-222"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useParams: () => ({
    org_slug: "test-org",
    project_slug: "my-proj",
    rule_id: "rule-0001",
  }),
}));
vi.mock("@/lib/auth/use-permission", () => ({
  usePermission: vi.fn().mockReturnValue({
    role: "member",
    canView: true,
    canOperate: true,
    canWrite: true,
    canAdmin: false,
    isOwner: false,
  }),
}));

const mockRule = {
  rule_id: "rule-0001",
  org_id: "org-111",
  project_id: "proj-222",
  name: "cpu-warn",
  metric: "container.cpu.percent",
  threshold_warn: 70,
  threshold_critical: 90,
  operator: ">=" as const,
  throttle_seconds: 300,
  escalation_delay_seconds: 1800,
  dedup_bucket_seconds: 3600,
  enabled: true,
  created_by: "user-aaa",
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
};

const mockFiredHistory = [
  {
    fired_id: "fired-0001",
    rule_id: "rule-0001",
    org_id: "org-111",
    project_id: "proj-222",
    dedup_key: "abc123",
    severity: "critical" as const,
    current_value: 95,
    triggered_reason: "cpu >= 90",
    fired_at: "2026-06-01T11:00:00Z",
    escalated_at: null,
    last_seen_at: "2026-06-01T11:05:00Z",
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("AlertRuleDetailPage", () => {
  it("renders rule name and metric", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockRule)
      .mockResolvedValueOnce([]);
    render(<AlertRuleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("cpu-warn")).toBeInTheDocument();
      expect(screen.getByText("container.cpu.percent")).toBeInTheDocument();
    });
  });

  it("renders fired history with severity badge", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockRule)
      .mockResolvedValueOnce(mockFiredHistory);
    render(<AlertRuleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("critical")).toBeInTheDocument();
    });
  });

  it("edit form is visible for member+", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockRule)
      .mockResolvedValueOnce([]);
    render(<AlertRuleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save rule/i }),
      ).toBeInTheDocument();
    });
  });
});
