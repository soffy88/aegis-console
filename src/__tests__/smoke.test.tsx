import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders booting message", () => {
    render(<Home />);
    expect(screen.getByText(/Aegis Console/i)).toBeInTheDocument();
  });

  it("renders a main element", () => {
    render(<Home />);
    expect(document.querySelector("main")).not.toBeNull();
  });

  it("snapshot matches", () => {
    const { container } = render(<Home />);
    expect(container.firstChild).toBeTruthy();
  });
});
