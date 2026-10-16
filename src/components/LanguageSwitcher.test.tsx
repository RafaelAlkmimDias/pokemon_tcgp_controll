// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { dictionaries } from "@/lib/i18n/dictionaries";

const setLocaleMock = vi.fn();
vi.mock("@/lib/i18n/actions", () => ({
  setLocale: (locale: string) => setLocaleMock(locale),
}));

describe("LanguageSwitcher", () => {
  it("shows the current locale as selected", () => {
    render(<LanguageSwitcher locale="pt" labels={dictionaries.pt.languageSwitcher} />);
    expect(screen.getByRole("combobox")).toHaveValue("pt");
  });

  it("calls setLocale with the newly picked locale", async () => {
    render(<LanguageSwitcher locale="pt" labels={dictionaries.pt.languageSwitcher} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    await waitFor(() => expect(setLocaleMock).toHaveBeenCalledWith("en"));
  });
});
