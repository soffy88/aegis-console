import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InstallPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/apps/install/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// The submit button is disabled until a default project is loaded, so every test
// must mock the /projects query to return at least one project.
function mockProjectsAnd(installResult: unknown = { install_id: "x", status: "installing" }) {
  vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
    if ((path as string).includes("/projects")) {
      return Promise.resolve([
        {
          id: "proj-1",
          org_id: "org-111",
          slug: "p",
          name: "P",
          display_name: "P",
          environment: "prod",
          config: null,
          docker_labels: null,
          archived_at: null,
          created_at: "",
        },
      ] as unknown as never);
    }
    return Promise.resolve(installResult as never);
  });
}

async function clickInstall(): Promise<void> {
  // Wait for the project to load so the button becomes enabled.
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /install/i })).not.toBeDisabled();
  });
  fireEvent.click(screen.getByRole("button", { name: /install/i }));
}

describe("InstallPage", () => {
  beforeEach(() => mockProjectsAnd());

  it("shows validation error when install_dir is empty", async () => {
    render(<InstallPage />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText("my-app"), { target: { value: "test-app" } });
    await clickInstall();
    await waitFor(() => {
      expect(screen.getByText("Required")).toBeInTheDocument();
    });
  });

  it("shows error when install_dir has whitespace", async () => {
    render(<InstallPage />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText("my-app"), { target: { value: "test-app" } });
    fireEvent.change(screen.getByPlaceholderText("/opt/apps/my-app"), {
      target: { value: "/opt/bad dir" },
    });
    await clickInstall();
    await waitFor(() => {
      expect(screen.getByText("No whitespace allowed")).toBeInTheDocument();
    });
  });

  it("calls aegisFetch on valid submission", async () => {
    render(<InstallPage />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText("my-app"), { target: { value: "my-app" } });
    fireEvent.change(screen.getByPlaceholderText("/opt/apps/my-app"), {
      target: { value: "/opt/my-app" },
    });
    await clickInstall();
    await waitFor(() => {
      expect(api.aegisFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/orgs/org-111/apps/install"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
