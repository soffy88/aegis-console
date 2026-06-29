import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StorePage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/store/page";
import AppDetailPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/store/[app_slug]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org", app_slug: "redis" }),
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

const mockDetail = {
  slug: "redis",
  name: "Redis",
  description: "In-memory store",
  icon: "🗄️",
  version: "7.4",
  category: "Database",
  image: "redis:latest",
  ports: [],
  env: [],
  mounts: [],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("StorePage (list)", () => {
  it("renders app cards from store", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockResponse as never);
    render(<StorePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Redis")).toBeInTheDocument();
      expect(screen.getByText("Nginx")).toBeInTheDocument();
    });
  });

  it("each card links to the org-scoped store detail page", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockResponse as never);
    render(<StorePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Redis").closest("a")).toHaveAttribute(
        "href",
        "/orgs/test-org/store/redis",
      );
    });
  });
});

describe("StoreAppDetail", () => {
  it("install link points to the org-scoped prefilled install page", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockDetail as never);
    render(<AppDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Install").closest("a")).toHaveAttribute(
        "href",
        "/orgs/test-org/apps/install?from=store&slug=redis",
      );
    });
  });
});
