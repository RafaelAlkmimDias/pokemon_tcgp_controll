import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

// Vitest doesn't auto-register RTL's cleanup unless `test.globals: true` is
// set; without it, each render() keeps piling onto the previous test's DOM.
afterEach(() => {
  cleanup();
});

// next/image requires Next's build-time loader; for component tests we only
// care that the right src/alt end up in the DOM, so render a plain <img>.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => React.createElement("img", { src, alt, className }),
}));
