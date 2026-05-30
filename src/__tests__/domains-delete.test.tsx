import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DomainsPage from "@/app/orgs/[org_slug]/domains/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
}));

const mockDomains = [
  {
    domain: "app.example.com",
    target_url: "http://localhost:8080",
    tls_enabled: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DomainsPage", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockDomains);
  });

  it("renders Domains heading", () => {
    render(<DomainsPage />, { wrapper });
    expect(screen.getByRole("heading", { name: "Domains" })).toBeInTheDocument();
  });

  it("shows Add Domain button", () => {
    render(<DomainsPage />, { wrapper });
    expect(screen.getByRole("button", { name: "Add Domain" })).toBeInTheDocument();
  });

  it("shows confirm dialog when domain row is clicked", async () => {
    render(<DomainsPage />, { wrapper });
    await waitFor(() => screen.getByText("app.example.com"));
    fireEvent.click(screen.getByText("app.example.com"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Remove Domain/i })).toBeInTheDocument();
    });
  });
});
