import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { IntlTestProvider } from "@/test/intl-provider";
import en from "../../../messages/en.json";

describe("home shell placeholder", () => {
  it("has the localized home title in every-locale message shape", () => {
    expect(en.home.app_home_title).toBeTruthy();
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
