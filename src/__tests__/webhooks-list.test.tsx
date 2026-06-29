import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WebhooksListPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/webhooks/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({
  useOrgIdBySlug: vi.fn().mockReturnValue("org-111"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
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

const mockSub = {
  sub_id: "sub-0001",
  org_id: "org-111",
  name: "my-webhook",
  url: "https://example.com/webhook",
  has_secret: false,
  event_types: ["alert.fired"],
  retry_count: 3,
  retry_backoff_seconds: [5, 15, 45],
  enabled: true,
  created_by: "user-aaa",
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("WebhooksListPage", () => {
  it("renders empty state when no webhooks", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<WebhooksListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/no webhook subscriptions/i)).toBeInTheDocument();
    });
  });

  it("renders table with webhook name and url", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([mockSub]);
    render(<WebhooksListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("my-webhook")).toBeInTheDocument();
      expect(screen.getByText(/example\.com/)).toBeInTheDocument();
    });
  });

  it("create button visible for member+", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<WebhooksListPage />, { wrapper });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create webhook/i }),
      ).toBeInTheDocument();
    });
  });
});
