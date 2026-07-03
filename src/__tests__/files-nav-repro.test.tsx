import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FilesPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/files/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  aegisFetch: vi.fn(),
  aegisBlob: vi.fn(),
  aegisUpload: vi.fn(),
}));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({ useParams: () => ({ org_slug: "test-org" }) }));

const listing = {
  path: "/data",
  parent: null,
  entries: [
    { name: "sub", path: "/data/sub", is_dir: true, is_symlink: false, size: 0, mtime: 0, mode: "0o755" },
    { name: "a.txt", path: "/data/a.txt", is_dir: false, is_symlink: false, size: 5, mtime: 0, mode: "0o644" },
  ],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FilesPage navigation", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if (path.includes("/files/roots")) return Promise.resolve({ roots: ["/data"] } as never);
      if (path.includes("/files/list")) return Promise.resolve(listing as never);
      return Promise.resolve({} as never);
    });
  });

  it("does not loop when clicking a folder row", async () => {
    const errs: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((m: unknown) => errs.push(String(m)));
    render(<FilesPage />, { wrapper });
    await waitFor(() => screen.getByText("sub"));
    fireEvent.click(screen.getByText("sub"));
    await new Promise((r) => setTimeout(r, 300));
    spy.mockRestore();
    const loop = errs.find((e) => /Maximum update depth/i.test(e));
    expect(loop, `render loop detected:\n${loop}`).toBeUndefined();
  });
});
