import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/projects/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
  usePathname: () => "/orgs/test-org/projects",
}));

// C1-4 DB-backed Project shape.
const mockProjects = [
  {
    id: "p-1", org_id: "org-111", slug: "stratum", name: "Stratum",
    display_name: "Stratum", environment: "prod", docker_labels: null,
    config: null, archived_at: null, created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "p-2", org_id: "org-111", slug: "hevi", name: "Hevi",
    display_name: "Hevi", environment: "staging", docker_labels: null,
    config: null, archived_at: null, created_at: "2026-01-01T00:00:00Z",
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ProjectsPage", () => {
  it("renders project cards after fetch", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockProjects);
    render(<ProjectsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Stratum")).toBeInTheDocument();
      expect(screen.getByText("Hevi")).toBeInTheDocument();
    });
  });

  it("shows environment label", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockProjects);
    render(<ProjectsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("prod")).toBeInTheDocument();
      expect(screen.getByText("staging")).toBeInTheDocument();
    });
  });

  it("links to org-scoped project detail page", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockProjects);
    render(<ProjectsPage />, { wrapper });
    await waitFor(() => {
      const link = screen.getByText("Stratum").closest("a");
      expect(link).toHaveAttribute("href", "/orgs/test-org/projects/stratum");
    });
  });
});
