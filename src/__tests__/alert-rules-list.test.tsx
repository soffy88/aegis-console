import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AlertRulesListPage from "@/app/orgs/[org_slug]/projects/[project_slug]/alert-rules/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({
  useOrgIdBySlug: vi.fn().mockReturnValue("org-111"),
}));
vi.mock("@/hooks/use-project-id", () => ({
  useProjectIdBySlug: vi.fn().mockReturnValue("proj-222"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org", project_slug: "my-proj" }),
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

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("AlertRulesListPage", () => {
  it("renders empty state when no rules", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<AlertRulesListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/no alert rules/i)).toBeInTheDocument();
    });
  });

  it("renders table with rule rows", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([mockRule]);
    render(<AlertRulesListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("cpu-warn")).toBeInTheDocument();
      expect(screen.getByText("container.cpu.percent")).toBeInTheDocument();
    });
  });

  it("create button visible for member+", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<AlertRulesListPage />, { wrapper });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create alert rule/i }),
      ).toBeInTheDocument();
    });
  });

  it("create button hidden for viewer (no canWrite)", async () => {
    const { usePermission } = await import("@/lib/auth/use-permission");
    vi.mocked(usePermission).mockReturnValueOnce({
      role: "viewer",
      canView: true,
      canOperate: false,
      canWrite: false,
      canAdmin: false,
      isOwner: false,
    });
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<AlertRulesListPage />, { wrapper });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /create alert rule/i }),
      ).not.toBeInTheDocument(),
    );
  });
});
