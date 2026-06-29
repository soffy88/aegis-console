import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StorePage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/store/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
  usePathname: () => "/orgs/test-org/store",
}));

const mockResponse = {
  total: 2,
  page: 1,
  per_page: 60,
  items: [
    { slug: "redis", name: "Redis", description: "In-memory store", icon: "🗄️", category: "Database", image: "redis:latest" },
    { slug: "nginx", name: "Nginx", description: "Web server", icon: "🌐", category: "Web", image: "nginx:latest" },
  ],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("StorePage", () => {
  it("renders app cards from store", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockResponse);
    render(<StorePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Redis")).toBeInTheDocument();
      expect(screen.getByText("Nginx")).toBeInTheDocument();
    });
  });

  it("install link points to org-scoped prefilled install page", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockResponse);
    render(<StorePage />, { wrapper });
    await waitFor(() => {
      const links = screen.getAllByText("Install");
      expect(links[0]!.closest("a")).toHaveAttribute(
        "href",
        "/orgs/test-org/apps/install?from=store&slug=redis",
      );
    });
  });
});
