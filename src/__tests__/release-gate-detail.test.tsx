import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReleaseGateDetailPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/projects/[project_slug]/release-gates/[gate_id]/page";
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
    gate_id: "gate-aaaa-0001",
  }),
}));

const mockPendingGate = {
  gate_id: "gate-aaaa-0001",
  org_id: "org-111",
  project_id: "proj-222",
  autoheal_event_id: null,
  action_kind: "restart_container",
  action_payload: { container: "nginx" },
  requested_by: "user-aaaa-0001",
  requested_at: "2026-06-01T10:00:00Z",
  state: "pending" as const,
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  expires_at: "2026-06-02T10:00:00Z",
};

const mockApprovedGate = {
  ...mockPendingGate,
  state: "approved" as const,
  decided_by: "user-bbbb-0002",
  decided_at: "2026-06-01T11:00:00Z",
  decision_reason: "looks safe",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// Default: canOperate = true (operator role)
vi.mock("@/lib/auth/use-permission", () => ({
  usePermission: () => ({
    role: "operator",
    canView: true,
    canOperate: true,
    canWrite: false,
    canAdmin: false,
    isOwner: false,
  }),
}));

describe("ReleaseGateDetailPage (pending, canOperate)", () => {
  it("renders gate action_kind and state badge", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockPendingGate);
    render(<ReleaseGateDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("restart_container")).toBeInTheDocument();
      expect(screen.getByText("pending")).toBeInTheDocument();
    });
  });

  it("approve button disabled without reason", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockPendingGate);
    render(<ReleaseGateDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });
    const approveBtn = screen.getByText("Approve");
    expect(approveBtn).toBeDisabled();
  });

  it("approve button enabled after typing reason", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockPendingGate);
    render(<ReleaseGateDetailPage />, { wrapper });
    await waitFor(() => screen.getByText("Approve"));
    const textarea = screen.getByPlaceholderText(/why approve/i);
    fireEvent.change(textarea, { target: { value: "approved by ops" } });
    expect(screen.getByText("Approve")).not.toBeDisabled();
  });
});

describe("ReleaseGateDetailPage (approved, no decide form)", () => {
  it("shows decision section when not pending", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockApprovedGate);
    render(<ReleaseGateDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Decision")).toBeInTheDocument();
      expect(screen.getByText("looks safe")).toBeInTheDocument();
    });
  });

  it("does not show decide form when approved", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockApprovedGate);
    render(<ReleaseGateDetailPage />, { wrapper });
    await waitFor(() =>
      expect(screen.queryByText("Approve")).not.toBeInTheDocument(),
    );
  });
});
