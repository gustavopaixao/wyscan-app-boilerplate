import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { IntlTestProvider } from "@/test/intl-provider";
import en from "../../../messages/en.json";

describe("landing placeholder", () => {
  it("has the localized landing title in the message shape", () => {
    expect(en.landing.site_landing_title).toBeTruthy();
  });

  it("renders the theme toggle with an accessible label", async () => {
    render(
      <IntlTestProvider>
        <ThemeToggle />
      </IntlTestProvider>,
    );
    expect(
      await screen.findByRole("button", { name: en.theme.toggle }),
    ).toBeInTheDocument();
  });
});
