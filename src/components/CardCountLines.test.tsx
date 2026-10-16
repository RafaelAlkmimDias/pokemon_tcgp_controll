// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardCountLines } from "@/components/CardCountLines";
import { dictionaries } from "@/lib/i18n/dictionaries";

const t = dictionaries.pt.cardCountLines;

describe("CardCountLines", () => {
  it("renders both owned/total lines", () => {
    render(
      <CardCountLines
        stats={{ commonOwned: 3, commonTotal: 5, allOwned: 4, allTotal: 7 }}
        t={t}
      />,
    );
    expect(screen.getByText(/3\/5 cartas/)).toBeInTheDocument();
    expect(screen.getByText(/4\/7 cartas totais/)).toBeInTheDocument();
  });

  it("shows a complete check only when owned equals total and total is non-zero", () => {
    render(
      <CardCountLines
        stats={{ commonOwned: 5, commonTotal: 5, allOwned: 4, allTotal: 7 }}
        t={t}
      />,
    );
    expect(screen.getAllByLabelText("Completo")).toHaveLength(1);
  });

  it("does not show a complete check when total is zero", () => {
    render(
      <CardCountLines
        stats={{ commonOwned: 0, commonTotal: 0, allOwned: 0, allTotal: 0 }}
        t={t}
      />,
    );
    expect(screen.queryByLabelText("Completo")).not.toBeInTheDocument();
  });

  it("applies the extra className alongside the base class", () => {
    const { container } = render(
      <CardCountLines
        stats={{ commonOwned: 0, commonTotal: 0, allOwned: 0, allTotal: 0 }}
        className="count-lines-header"
        t={t}
      />,
    );
    expect(container.firstChild).toHaveClass("count-lines", "count-lines-header");
  });

  it("uses the given locale's labels", () => {
    render(
      <CardCountLines
        stats={{ commonOwned: 1, commonTotal: 1, allOwned: 1, allTotal: 1 }}
        t={dictionaries.en.cardCountLines}
      />,
    );
    expect(screen.getByText(/1\/1 cards/)).toBeInTheDocument();
    // Both the "cards" and "total cards" lines are complete here.
    expect(screen.getAllByLabelText("Complete")).toHaveLength(2);
  });
});
