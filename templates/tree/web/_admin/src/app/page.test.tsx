import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { adminStrings } from "@/lib/i18n/strings";
import DashboardPage from "./page";

describe("dashboard placeholder", () => {
  it("renders the keyed dashboard title", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", {
        name: adminStrings.admin_dashboard_title,
      }),
    ).toBeInTheDocument();
  });
});
