import { describe, it, expect } from "vitest";
import { render, screen } from "../tests/test-utils";
import HomePage from "../pages/HomePage";

describe("HomePage", () => {
  it("renders the main heading", () => {
    render(<HomePage />);

    expect(
      screen.getByText(/Discover & Buy African Beats/i),
    ).toBeInTheDocument();
  });

  it("shows login and signup buttons when not authenticated", () => {
    render(<HomePage />);

    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  it("has a link to browse beats", () => {
    render(<HomePage />);

    expect(screen.getByText("Browse Beats")).toBeInTheDocument();
  });
});
